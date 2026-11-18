/**
 * Hero B: static carousel. Full-bleed backdrop that crossfades between slides, title logo
 * (or the title set in type), metadata line, overview and a More info button.
 * Left/Right change slides (no wrap); OK opens the Display Page.
 */
import { sections } from '../../core/app-registries.ts';
import { localized, type Title } from '../../core/catalog.ts';
import { renderMetadataLine } from '../../core/metadata.ts';
import type { Key, KeyResult } from '../../core/types.ts';

sections.register({
  type: 'hero',
  variant: 'B',
  label: 'Static carousel',
  create(config, ctx) {
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
    el.append(backdrops, scrim, content, dots);

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
      loadImage(index + 1); // ahead of focus
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
      },
      blur() {
        focused = false;
        el.classList.remove('is-active');
        render();
      },
      handleKey(key: Key): KeyResult {
        if (key === 'left' || key === 'right') {
          const next = index + (key === 'right' ? 1 : -1);
          if (next < 0 || next >= slides.length) return key === 'left' ? 'exit-left' : 'exit-right';
          index = next;
          ctx.memory.set(memoryKey, index);
          render();
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
        layers.forEach((img) => img.removeAttribute('src'));
      },
    };
  },
});
