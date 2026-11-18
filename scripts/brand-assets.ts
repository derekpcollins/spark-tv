/**
 * Writes the static Glint files from the same source as the runtime component:
 * public/brand/mark-large.svg, mark-small.svg, mark-on-light.svg, public/favicon.svg,
 * and the 32/180/512 PNG favicon set (small cut) via macOS `sips`.
 * Run: npm run brand:assets
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { flattenTokens } from '../src/core/tokens.ts';
import { markMarkup, type MarkCut } from '../src/brand/glint.ts';

const root = join(import.meta.dirname, '..');
const vars = flattenTokens(JSON.parse(readFileSync(join(root, 'design/tokens.json'), 'utf8')));
const color = (token: string): string => {
  const value = vars[`--${token}`];
  if (!value) throw new Error(`Missing token ${token}`);
  return value;
};

const outDir = join(root, 'public/brand');
mkdirSync(outDir, { recursive: true });

const svg = (cut: MarkCut, onLight: boolean, halo: boolean, width?: number): string =>
  markMarkup({ cut, onLight, halo, idPrefix: 'glint', color, width }) + '\n';

const files: Record<string, string> = {
  'mark-large.svg': svg('large', false, true),
  'mark-small.svg': svg('small', false, false),
  'mark-on-light.svg': svg('large', true, false),
};
for (const [name, content] of Object.entries(files)) writeFileSync(join(outDir, name), content);
writeFileSync(join(root, 'public/favicon.svg'), svg('small', false, false));

// PNG favicons: render the small cut at each size, square canvas, transparent background.
const tmp = join(outDir, '.tmp');
mkdirSync(tmp, { recursive: true });
for (const size of [32, 180, 512]) {
  const square =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-92 -92 184 184">` +
    markMarkup({ cut: 'small', onLight: false, halo: false, idPrefix: 'g', color }).replace(
      /^<svg[^>]*>/,
      '<svg x="-92" y="-62" width="184" height="124" viewBox="-92 -62 184 124">',
    ) +
    '</svg>';
  const src = join(tmp, `favicon-${size}.svg`);
  writeFileSync(src, square);
  execFileSync('sips', ['-s', 'format', 'png', src, '--out', join(outDir, `favicon-${size}.png`)], {
    stdio: 'ignore',
  });
}
rmSync(tmp, { recursive: true, force: true });
console.log('Wrote public/brand/* and public/favicon.svg');
