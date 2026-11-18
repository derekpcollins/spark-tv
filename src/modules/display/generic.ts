/**
 * Generic Display Page, one per contentType (movie, tv), variant A. A clearly marked
 * placeholder region holds the space for Derek's designs; variant B registers alongside.
 * Non–Spark Free titles are static: backdrop plus "Watch on <provider>" buttons that take
 * focus but don't launch.
 */
import { displayPages, type DisplayPageFactory } from '../../core/app-registries.ts';
import { localized } from '../../core/catalog.ts';
import { renderMetadataLine } from '../../core/metadata.ts';
import type { Key, KeyResult } from '../../core/types.ts';

const createGeneric: DisplayPageFactory = (title, ctx) => {
  const text = localized(title, ctx.locale());
  const el = document.createElement('div');
  el.className = `display display--${title.contentType}`;

  const backdrop = document.createElement('img');
  backdrop.className = 'display__backdrop';
  backdrop.alt = '';
  if (title.images.backdrop) backdrop.src = title.images.backdrop;
  const scrim = document.createElement('div');
  scrim.className = 'display__scrim';

  const content = document.createElement('div');
  content.className = 'display__content';
  if (title.images.logo) {
    const logo = document.createElement('img');
    logo.className = 'display__logo';
    logo.src = title.images.logo;
    logo.alt = text.title;
    content.append(logo);
  } else {
    const h = document.createElement('h1');
    h.className = 'display__title';
    h.textContent = text.title;
    content.append(h);
  }
  content.append(renderMetadataLine(text.metadataLine));
  const overview = document.createElement('p');
  overview.className = 'display__overview';
  overview.textContent = text.overview;
  content.append(overview);

  const actions = document.createElement('div');
  actions.className = 'display__actions';
  const buttons = title.providers
    .map((id) => ctx.catalog.providers[id])
    .filter((p) => p !== undefined)
    .map((p) => {
      const b = document.createElement('span');
      b.className = 'button';
      const logo = document.createElement('img');
      logo.className = 'button__logo';
      logo.src = p.logo;
      logo.alt = '';
      b.append(logo, document.createTextNode(ctx.t('display.watchOn', { provider: p.name })));
      actions.append(b);
      return b;
    });
  if (!buttons.length) {
    const note = document.createElement('p');
    note.className = 'display__note';
    note.textContent = ctx.t('display.notStreaming');
    actions.append(note);
  }
  content.append(actions);

  const placeholder = document.createElement('div');
  placeholder.className = 'display__placeholder';
  placeholder.textContent = ctx.t('display.placeholder');
  content.append(placeholder);

  el.append(backdrop, scrim, content);

  let index = 0;
  let focused = false;
  const render = (): void =>
    buttons.forEach((b, i) => b.classList.toggle('is-focused', focused && i === index));

  return {
    el,
    focus() {
      focused = true;
      render();
    },
    blur() {
      focused = false;
      render();
    },
    handleKey(key: Key): KeyResult {
      if (key === 'back') return 'back';
      if (key === 'left' && index > 0) index--;
      if (key === 'right' && index < buttons.length - 1) index++;
      render();
      return 'handled'; // OK on a provider button is intentionally inert
    },
    destroy() {
      backdrop.removeAttribute('src');
    },
  };
};

displayPages.register({ type: 'movie', variant: 'A', label: 'Generic (A)', create: createGeneric });
displayPages.register({ type: 'tv', variant: 'A', label: 'Generic (A)', create: createGeneric });
