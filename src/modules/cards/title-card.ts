/** Shared builder for title cards (poster 2:3, landscape 16:9). */
import type { CardInstance } from '../../core/app-registries.ts';
import { localized } from '../../core/catalog.ts';
import type { ModuleContext } from '../../core/types.ts';

export function titleCard(
  itemId: string,
  ctx: ModuleContext,
  shape: 'poster' | 'landscape',
  width: number,
  showTitle = true,
): CardInstance {
  const title = ctx.catalog.titles[itemId];
  const el = document.createElement('div');
  el.className = `card card--${shape}`;
  el.style.width = `${width}px`;

  const frame = document.createElement('div');
  frame.className = 'card__frame';
  const img = document.createElement('img');
  img.className = 'card__img';
  img.alt = '';
  img.decoding = 'async';
  frame.append(img);

  // Landscape cards set the title in type over the backdrop. Poster cards without a poster
  // (Spark Free films with no textless poster) set it in type instead of showing an empty frame.
  const typeset = shape === 'poster' && title && !title.images.poster;
  if (typeset) frame.classList.add('card__frame--typeset');
  if ((shape === 'landscape' && title && showTitle) || typeset) {
    const label = document.createElement('div');
    label.className = 'card__label';
    label.textContent = localized(title, ctx.locale()).title;
    frame.append(label);
  }
  el.append(frame);

  let loaded = false;
  return {
    el,
    width,
    load() {
      if (loaded || !title) return;
      loaded = true;
      const src =
        shape === 'poster' ? title.images.poster : title.images.backdrop?.replace('/w1280/', '/w780/');
      if (src) {
        img.addEventListener('load', () => el.classList.add('is-loaded'), { once: true });
        img.src = src;
      }
    },
    activate() {
      if (!title) return false;
      ctx.openTitle(title);
      return true;
    },
    destroy() {
      img.removeAttribute('src');
    },
  };
}
