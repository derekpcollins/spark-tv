import { describe, expect, it } from 'vitest';
import { flattenTokens } from './tokens.ts';
import { fitScale } from './canvas.ts';

describe('flattenTokens', () => {
  it('flattens paths and resolves references', () => {
    const vars = flattenTokens({ color: { raw: { white: '#fff' }, text: { default: '{color.raw.white}' } } });
    expect(vars).toEqual({ '--color-raw-white': '#fff', '--color-text-default': '#fff' });
  });

  it('throws on unknown references', () => {
    expect(() => flattenTokens({ a: '{missing.path}' })).toThrow(/Unknown token/);
  });
});

describe('fitScale', () => {
  it('letterboxes to the smaller ratio', () => {
    expect(fitScale(1920, 1080)).toBe(1);
    expect(fitScale(3840, 2160)).toBe(2);
    expect(fitScale(1920, 1200)).toBe(1);
    expect(fitScale(1280, 1080)).toBeCloseTo(1280 / 1920);
  });
});
