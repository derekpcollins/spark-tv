/**
 * Shared hero builder (not a module): full-bleed backdrop that crossfades between slides, title
 * logo (or the title set in type), metadata line, overview and a More info button. Left/Right
 * change slides and wrap; OK opens the Display Page. With `video`, the focused slide plays its
 * trailer over the backdrop after a short rest, then advances to the next slide when it ends.
 * Hero A (video billboard) and hero B (static carousel) register their own files.
 */
import { assetUrl, TRAILER_DELAY_MS } from '../../config.ts';
import { localized, type SectionConfig, type Title } from '../../core/catalog.ts';
import { renderMetadataLine } from '../../core/metadata.ts';
import type { Key, KeyResult, ModuleContext, ModuleInstance } from '../../core/types.ts';
import { createVideo } from '../../core/video.ts';

export function createHero(
  config: SectionConfig,
  ctx: ModuleContext,
  opts: { video: boolean },
): ModuleInstance {
  const slides: Title[] = (ctx.catalog.sections[config.id] ?? [])
    .map((id) => ctx.catalog.titles[id])
    .filter((t): t is Title => Boolean(t?.images.backdrop));
  const memoryKey = `hero:${config.id}`;

  const el = document.createElement('section');
  el.className = 'hero';
  const backdrops = document.createElement('div');
  backdrops.className = 'hero__backdrops';
  const layers = slides.map((t) => {
    const img = document.createElement('img');
    img.className = 'hero__backdrop';
    img.alt = '';
    img.dataset.src = t.images.backdrop ?? '';
    backdrops.append(img);
    return img;
  });
  const scrim = document.createElement('div');
  scrim.className = 'hero__scrim';
  const content = document.createElement('div');
  content.className = 'hero__content';
  const dots = document.createElement('div');
  dots.className = 'hero__dots';
  const dotEls = slides.map(() => {
    const d = document.createElement('span');
    d.className = 'hero__dot';
    dots.append(d);
    return d;
  });
  const video = opts.video ? createVideo('hero__video') : null;
  if (video) backdrops.append(video.el);
  el.append(backdrops, scrim, content);
  if (ctx.option('hero', 'dots') !== false) el.append(dots);

  let timer: ReturnType<typeof setTimeout> | undefined;
  function stopTrailer(): void {
    clearTimeout(timer);
    video?.stop();
  }
  /** Restart the countdown to the current slide's trailer (only while focused). */
  function scheduleTrailer(): void {
    stopTrailer();
    const trailer = slides[index]?.video?.trailer;
    if (!video || !focused || !trailer) return;
    timer = setTimeout(
      () => video.play(assetUrl(trailer), { muted: ctx.option('hero', 'sound') !== true }),
      TRAILER_DELAY_MS,
    );
  }
  video?.el.addEventListener('ended', () => {
    if (slides.length < 2) return scheduleTrailer();
    index = (index + 1) % slides.length;
    ctx.memory.set(memoryKey, index);
    render();
    scheduleTrailer();
  });

  let index = Math.min(ctx.memory.get<number>(memoryKey) ?? 0, Math.max(slides.length - 1, 0));
  let focused = false;

  function loadImage(i: number): void {
    const img = layers[i];
    if (img && !img.src && img.dataset.src) img.src = img.dataset.src;
  }

  function renderContent(): void {
    const title = slides[index];
    content.replaceChildren();
    if (!title) return;
    const text = localized(title, ctx.locale());
    if (title.images.logo) {
      const logo = document.createElement('img');
      logo.className = 'hero__logo';
      logo.src = title.images.logo;
      logo.alt = text.title;
      content.append(logo);
    } else {
      const h = document.createElement('h1');
      h.className = 'hero__title';
      h.textContent = text.title;
      content.append(h);
    }
    content.append(renderMetadataLine(text.metadataLine));
    const overview = document.createElement('p');
    overview.className = 'hero__overview';
    overview.textContent = text.overview;
    const button = document.createElement('span');
    button.className = 'button';
    button.classList.toggle('is-focused', focused);
    button.textContent = ctx.t('hero.moreInfo');
    content.append(overview, button);
  }

  function render(): void {
    loadImage(index);
    // Ahead of focus in both directions, since the carousel wraps.
    loadImage((index + 1) % slides.length);
    loadImage((index - 1 + slides.length) % slides.length);
    layers.forEach((img, i) => img.classList.toggle('is-visible', i === index));
    dotEls.forEach((d, i) => d.classList.toggle('is-current', i === index));
    renderContent();
  }

  render();

  return {
    el,
    focusable: () => slides.length > 0,
    focus() {
      focused = true;
      el.classList.add('is-active');
      render();
      scheduleTrailer();
    },
    blur() {
      focused = false;
      el.classList.remove('is-active');
      stopTrailer();
      render();
    },
    handleKey(key: Key): KeyResult {
      if (key === 'left' || key === 'right') {
        // Wraps: Right on the last slide goes to the first, Left on the first to the last.
        if (slides.length < 2) return key === 'left' ? 'exit-left' : 'exit-right';
        index = (index + (key === 'right' ? 1 : -1) + slides.length) % slides.length;
        ctx.memory.set(memoryKey, index);
        render();
        scheduleTrailer();
        return 'handled';
      }
      if (key === 'ok') {
        const title = slides[index];
        if (title) ctx.openTitle(title);
        return 'handled';
      }
      if (key === 'up') return 'exit-up';
      if (key === 'down') return 'exit-down';
      if (key === 'back') return 'back';
      return 'handled';
    },
    destroy() {
      stopTrailer();
      layers.forEach((img) => img.removeAttribute('src'));
    },
  };
}
