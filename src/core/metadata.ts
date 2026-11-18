/** metadataLine: strings or typed items, with separators added automatically. */
import type { MetadataItem } from './catalog.ts';

export function renderMetadataLine(items: MetadataItem[]): HTMLElement {
  const line = document.createElement('div');
  line.className = 'meta';
  items.forEach((item, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'meta__sep';
      sep.setAttribute('aria-hidden', 'true');
      line.append(sep);
    }
    line.append(renderItem(item));
  });
  return line;
}

function renderItem(item: MetadataItem): HTMLElement {
  if (typeof item === 'string') return span('meta__text', item);
  switch (item.kind) {
    case 'text':
      return span('meta__text', item.text);
    case 'badge':
      return span('meta__badge', item.text);
    case 'icon':
      return span(`meta__icon meta__icon--${item.name}`, '');
    case 'image': {
      const img = document.createElement('img');
      img.className = 'meta__image';
      img.src = item.src;
      img.alt = item.alt;
      return img;
    }
  }
}

function span(className: string, text: string): HTMLElement {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}
