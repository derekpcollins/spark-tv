import { describe, expect, it } from 'vitest';
import { cutForSize, markHeight, markMarkup } from './glint.ts';
import { createMark } from './mark.ts';
import { createWordmark, MIN_LOCKUP_FONT } from './wordmark.ts';

const color = (t: string) => `var(--${t})`;

describe('Glint mark', () => {
  it('uses the small cut at 32 px and below', () => {
    expect(cutForSize(32)).toBe('small');
    expect(cutForSize(33)).toBe('large');
  });

  it('keeps the cut aspect ratio', () => {
    expect(markHeight(256, 'large')).toBe(140);
    expect(markHeight(184, 'small')).toBe(124);
  });

  it('draws the halo only when asked and never on light', () => {
    const base = { cut: 'large' as const, idPrefix: 't', color };
    expect(markMarkup({ ...base, onLight: false, halo: true })).toContain('glint-halo');
    expect(markMarkup({ ...base, onLight: false, halo: false })).not.toContain('glint-halo');
    expect(markMarkup({ ...base, onLight: true, halo: true })).not.toContain('glint-halo');
  });

  it('defaults the halo to 64 px and up, with unique gradient ids', () => {
    expect(createMark({ size: 63 }).querySelector('.glint-halo')).toBeNull();
    expect(createMark({ size: 64 }).querySelector('.glint-halo')).not.toBeNull();
    const a = createMark({ size: 40 }).querySelector('radialGradient')!.id;
    const b = createMark({ size: 40 }).querySelector('radialGradient')!.id;
    expect(a).not.toBe(b);
  });
});

describe('Wordmark', () => {
  it('header lockup is the wordmark only', () => {
    const el = createWordmark({ fontSize: 32, lockup: 'wordmark' });
    expect(el.querySelector('svg')).toBeNull();
    expect(el.textContent).toBe('SPARKTV');
    expect(el.getAttribute('aria-label')).toBe('Spark TV');
  });

  it('sizes the mark from the font size per lockup', () => {
    expect(createWordmark({ fontSize: 20 }).querySelector('svg')!.getAttribute('width')).toBe('48');
    expect(
      createWordmark({ fontSize: 20, lockup: 'stacked' }).querySelector('svg')!.getAttribute('width'),
    ).toBe('64');
  });

  it('shows the mark only below the minimum lockup size', () => {
    const el = createWordmark({ fontSize: MIN_LOCKUP_FONT - 1 });
    expect(el.querySelector('svg')).not.toBeNull();
    expect(el.querySelector('.brand__text')).toBeNull();
  });
});
