/**
 * Design-system check: brand and visual values come from design/tokens.json only.
 * Fails if source files hard-code colours, font families or easing/durations.
 * Allowed: design/tokens.json itself, and SVG geometry (numbers, not colours).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const SCAN = ['src'];
const EXT = /\.(ts|css)$/;
const SKIP = /\.test\.ts$/;

const RULES: [string, RegExp][] = [
  ['hex colour', /#[0-9a-fA-F]{3,8}\b/],
  ['rgb/hsl colour', /\b(?:rgba?|hsla?)\(/],
  ['font-family literal', /font-family:(?!\s*var\()/],
  ['cubic-bezier literal', /cubic-bezier\(/],
  ['duration literal in CSS', /(?:transition|animation)[^;]*\b\d+m?s\b/],
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return EXT.test(name) && !SKIP.test(name) ? [path] : [];
  });
}

describe('design tokens are the only source of visual values', () => {
  const offenders: string[] = [];
  for (const file of SCAN.flatMap((d) => files(join(root, d)))) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (line.includes('tokens-ok')) return; // explicit, reviewed exception
        for (const [label, re] of RULES) {
          if (re.test(line)) offenders.push(`${relative(root, file)}:${i + 1} ${label}: ${line.trim()}`);
        }
      });
  }

  it('finds no hard-coded colours, fonts, easings or durations in src/', () => {
    expect(offenders).toEqual([]);
  });
});
