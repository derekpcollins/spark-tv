import { cutForSize, HALO_MIN, markHeight, markMarkup, type MarkCut } from './glint.ts';

export interface MarkProps {
  /** Rendered width in canvas px. */
  size: number;
  /** Defaults to the cut for the size (small at 32 px and below). */
  cut?: MarkCut;
  onLight?: boolean;
  /** Defaults to on at 64 px and up; never drawn on light backgrounds. */
  halo?: boolean;
}

let instance = 0;

/** The Glint mark as an inline SVG element, colored from tokens. */
export function createMark(props: MarkProps): SVGSVGElement {
  const cut = props.cut ?? cutForSize(props.size);
  const halo = props.halo ?? props.size >= HALO_MIN;
  const host = document.createElement('div');
  host.innerHTML = markMarkup({
    cut,
    halo,
    onLight: props.onLight ?? false,
    idPrefix: `glint-${++instance}`,
    color: (token) => `var(--${token})`,
  });
  const svg = host.firstElementChild as SVGSVGElement;
  svg.classList.add('glint');
  svg.setAttribute('width', String(props.size));
  svg.setAttribute('height', String(markHeight(props.size, cut)));
  return svg;
}
