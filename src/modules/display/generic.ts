/**
 * Generic Display Page, one per contentType (movie, tv), variant A. A clearly marked
 * placeholder region holds the space for Derek's designs; variant B registers alongside.
 * Non–Spark Free titles are static: backdrop plus "Watch on <provider>" buttons that take
 * focus but don't launch. Spark Free titles play their trailer (muted, looping) behind the
 * content after a short rest, show their CC credit, and get a Play button that opens the player.
 */
import { assetUrl, TRAILER_DELAY_MS } from '../../config.ts';
import { displayPages, type DisplayPageFactory } from '../../core/app-registries.ts';
import { localized } from '../../core/catalog.ts';
import { renderMetadataLine } from '../../core/metadata.ts';
import type { Key, KeyResult } from '../../core/types.ts';
import { createVideo } from '../../core/video.ts';

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
  const video = title.video ? createVideo('display__video') : null;

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
  if (title.credit) {
    const credit = document.createElement('p');
    credit.className = 'display__credit';
    credit.textContent = [title.credit.line, title.credit.license, title.credit.extra]
      .filter(Boolean)
      .join(' · ');
    content.append(credit);
  }

  const actions = document.createElement('div');
  actions.className = 'display__actions';
  const buttons: { el: HTMLElement; run?: () => void }[] = [];
  if (title.video) {
    const play = document.createElement('span');
    play.className = 'button button--primary';
    const icon = document.createElement('span');
    icon.className = 'button__play';
    play.append(icon, document.createTextNode(ctx.t('display.play')));
    actions.append(play);
    buttons.push({ el: play, run: () => ctx.openOverlay('player', { title }) });
  }
  const providerButtons = title.providers
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
  buttons.push(...providerButtons.map((b) => ({ el: b }))); // OK on a provider button is intentionally inert
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

  el.append(backdrop, ...(video ? [video.el] : []), scrim, content);

  let index = 0;
  let focused = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const render = (): void =>
    buttons.forEach((b, i) => b.el.classList.toggle('is-focused', focused && i === index));
  const stopTrailer = (): void => {
    clearTimeout(timer);
    video?.stop();
  };

  return {
    el,
    focus() {
      focused = true;
      render();
      const trailer = title.video?.trailer;
      if (video && trailer) {
        timer = setTimeout(
          () => video.play(assetUrl(trailer), { muted: true, loop: true }),
          TRAILER_DELAY_MS,
        );
      }
    },
    blur() {
      focused = false;
      stopTrailer(); // e.g. the player opening on top
      render();
    },
    handleKey(key: Key): KeyResult {
      if (key === 'back') return 'back';
      if (key === 'left' && index > 0) index--;
      if (key === 'right' && index < buttons.length - 1) index++;
      if (key === 'ok') buttons[index]?.run?.();
      render();
      return 'handled';
    },
    destroy() {
      stopTrailer();
      backdrop.removeAttribute('src');
    },
  };
};

displayPages.register({ type: 'movie', variant: 'A', label: 'Generic (A)', create: createGeneric });
displayPages.register({ type: 'tv', variant: 'A', label: 'Generic (A)', create: createGeneric });
