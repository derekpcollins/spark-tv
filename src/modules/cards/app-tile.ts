/**
 * App tiles: Spark Free first, then real providers (logos from TMDB watch-provider data,
 * powered by JustWatch). Tiles take focus but don't launch anything.
 */
import { cards } from '../../core/app-registries.ts';
import { px } from '../../core/layout-tokens.ts';
import { createMark } from '../../brand/mark.ts';

cards.register({
  type: 'app',
  variant: 'default',
  label: 'App tile',
  create(itemId, ctx) {
    const width = px('card', 'app-width');
    const el = document.createElement('div');
    el.className = 'card card--app';
    el.style.width = `${width}px`;
    const frame = document.createElement('div');
    frame.className = 'card__frame app-tile';
    el.append(frame);

    let load = (): void => {};
    if (itemId === 'app:sparkfree') {
      frame.classList.add('app-tile--sparkfree');
      frame.setAttribute('aria-label', ctx.t('app.sparkfree'));
      frame.append(createMark({ size: Math.round(width * 0.3) }));
      const free = document.createElement('span');
      free.className = 'app-tile__free';
      free.textContent = ctx.t('app.free');
      frame.append(free);
    } else {
      const provider = ctx.catalog.providers[itemId.replace('provider:', '')];
      const img = document.createElement('img');
      img.className = 'app-tile__logo';
      img.alt = provider?.name ?? '';
      frame.append(img);
      load = () => {
        if (provider && !img.src) img.src = provider.logo;
      };
    }

    return { el, width, load, activate: () => false, destroy: () => {} };
  },
});
