import { createMark } from './mark.ts';

export type Lockup = 'wordmark' | 'horizontal' | 'stacked';

export interface WordmarkProps {
  /** Font size in canvas px. */
  fontSize: number;
  /** 'wordmark' (TV header), 'horizontal' (default lockup) or 'stacked' (launch screen). */
  lockup?: Lockup;
  onLight?: boolean;
}

/** Below this font size a lockup shows the mark only. */
export const MIN_LOCKUP_FONT = 14;

/**
 * "SPARK TV" in Unbounded Light: both words the same size and weight, 0.32em tracking,
 * a 0.5em gap between words, and the trailing tracking trimmed so it centers optically.
 * The brand name is not translated, so it doesn't go through i18n; it carries an aria-label.
 */
export function createWordmark(props: WordmarkProps): HTMLElement {
  const { fontSize, onLight = false } = props;
  const lockup = props.lockup ?? 'horizontal';
  const el = document.createElement('div');
  el.className = `brand brand--${lockup}${onLight ? ' brand--on-light' : ''}`;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'Spark TV');
  el.style.setProperty('--brand-font-size', `${fontSize}px`);

  if (lockup !== 'wordmark') {
    const ratio = lockup === 'stacked' ? 3.2 : 2.4;
    el.append(createMark({ size: Math.round(fontSize * ratio), onLight }));
    if (fontSize < MIN_LOCKUP_FONT) return el;
  }

  const text = document.createElement('span');
  text.className = 'brand__text';
  const spark = document.createElement('span');
  spark.className = 'brand__spark';
  spark.textContent = 'SPARK';
  const tv = document.createElement('span');
  tv.className = 'brand__tv';
  tv.textContent = 'TV';
  text.append(spark, tv);
  el.append(text);
  return el;
}
