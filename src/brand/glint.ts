/**
 * The Glint mark: an anamorphic lens flare (four-point glint with long horizontal arms).
 * Pure geometry + SVG markup, shared by the runtime component and the static-asset script.
 * Spec: docs/SPEC.md, "Brand".
 */
export type MarkCut = 'large' | 'small';

export const CUTS: Record<MarkCut, { viewBox: [number, number, number, number]; path: string }> = {
  large: {
    viewBox: [-128, -70, 256, 140],
    path: 'M0,-54 Q5,-5 120,0 Q5,5 0,54 Q-5,5 -120,0 Q-5,-5 0,-54Z',
  },
  small: {
    viewBox: [-92, -62, 184, 124],
    path: 'M0,-54 Q11,-11 84,0 Q11,11 0,54 Q-11,11 -84,0 Q-11,-11 0,-54Z',
  },
};

/** Small cut at 32 px wide and below; halo only at 64 px and up. */
export const SMALL_CUT_MAX = 32;
export const HALO_MIN = 64;

export function cutForSize(width: number): MarkCut {
  return width <= SMALL_CUT_MAX ? 'small' : 'large';
}

/** Height for a given rendered width, keeping the cut's aspect ratio. */
export function markHeight(width: number, cut: MarkCut = cutForSize(width)): number {
  const [, , w, h] = CUTS[cut].viewBox;
  return (width * h) / w;
}

/** Color source: token names → a CSS value (runtime: var(--…); static files: resolved hex). */
export type MarkColor = (token: string) => string;

export interface MarkMarkupOptions {
  cut: MarkCut;
  onLight: boolean;
  halo: boolean;
  /** Unique per instance so several inline marks don't share gradient ids. */
  idPrefix: string;
  color: MarkColor;
  width?: number;
}

const DARK_STOPS: [number, string][] = [
  [0, 'color-mark-stop-0'],
  [0.16, 'color-mark-stop-16'],
  [0.4, 'color-mark-stop-40'],
  [0.7, 'color-mark-stop-70'],
  [1, 'color-mark-stop-100'],
];
const LIGHT_STOPS: [number, string][] = [
  [0, 'color-mark-light-stop-0'],
  [0.55, 'color-mark-light-stop-55'],
  [1, 'color-mark-light-stop-100'],
];
const HALO_STOPS: [number, string][] = [
  [0, 'color-mark-halo-inner'],
  [0.45, 'color-mark-halo-mid'],
  [1, 'color-mark-halo-outer'],
];

function stops(list: [number, string][], color: MarkColor): string {
  return list
    .map(([offset, token]) => `<stop offset="${offset}" style="stop-color:${color(token)}"/>`)
    .join('');
}

export function markMarkup(o: MarkMarkupOptions): string {
  const { viewBox, path } = CUTS[o.cut];
  const fill = `${o.idPrefix}-fill`;
  const halo = `${o.idPrefix}-halo`;
  const showHalo = o.halo && !o.onLight;
  const size = o.width ? ` width="${o.width}" height="${markHeight(o.width, o.cut)}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.join(' ')}"${size} aria-hidden="true">` +
    '<defs>' +
    `<radialGradient id="${fill}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="scale(120 60)">` +
    stops(o.onLight ? LIGHT_STOPS : DARK_STOPS, o.color) +
    '</radialGradient>' +
    (showHalo
      ? `<radialGradient id="${halo}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="scale(100 60)">` +
        stops(HALO_STOPS, o.color) +
        '</radialGradient>'
      : '') +
    '</defs>' +
    (showHalo ? `<ellipse class="glint-halo" cx="0" cy="0" rx="100" ry="60" fill="url(#${halo})"/>` : '') +
    `<path class="glint-shape" d="${path}" fill="url(#${fill})"/>` +
    '</svg>'
  );
}
