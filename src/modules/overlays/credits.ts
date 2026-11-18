/**
 * Credits: TMDB logo + notice (less prominent than Spark's brand), JustWatch attribution,
 * a CC BY credit per Blender film, the Unbounded OFL notice, and a trademark disclaimer.
 */
import { overlays } from '../../core/app-registries.ts';
import { localized } from '../../core/catalog.ts';
import { createWordmark } from '../../brand/wordmark.ts';
import type { Key, KeyResult } from '../../core/types.ts';

overlays.register({
  type: 'credits',
  variant: 'default',
  label: 'Credits',
  create(_props, ctx) {
    const el = document.createElement('div');
    el.className = 'overlay credits';
    const body = document.createElement('div');
    body.className = 'credits__body';

    body.append(createWordmark({ fontSize: 40, lockup: 'horizontal' }));
    const h = document.createElement('h1');
    h.className = 'credits__title';
    h.textContent = ctx.t('credits.title');
    body.append(h);

    const section = (heading: string, ...nodes: (Node | string)[]): void => {
      const s = document.createElement('section');
      s.className = 'credits__section';
      const h2 = document.createElement('h2');
      h2.textContent = heading;
      s.append(h2, ...nodes.map((n) => (typeof n === 'string' ? para(n) : n)));
      body.append(s);
    };
    const para = (text: string): HTMLElement => {
      const p = document.createElement('p');
      p.textContent = text;
      return p;
    };

    const tmdb = document.createElement('img');
    tmdb.className = 'credits__tmdb';
    tmdb.src = '/attribution/tmdb-short.svg';
    tmdb.alt = 'TMDB';
    section(ctx.t('credits.data'), tmdb, ctx.t('credits.tmdb'), ctx.t('credits.justwatch'));

    const films = Object.values(ctx.catalog.titles).filter((t) => t.source === 'sparkfree');
    if (films.length) {
      const list = document.createElement('ul');
      for (const film of films) {
        const li = document.createElement('li');
        li.textContent = [
          `${localized(film, ctx.locale()).title}: ${film.credit?.line ?? '(CC) Blender Foundation | studio.blender.org'}`,
          film.credit?.license,
          film.credit?.extra,
        ]
          .filter(Boolean)
          .join(' · ');
        list.append(li);
      }
      section(ctx.t('credits.films'), list);
    }

    section(ctx.t('credits.type'), ctx.t('credits.unbounded'));
    section(ctx.t('credits.trademarks'), ctx.t('credits.disclaimer'));

    const hint = document.createElement('p');
    hint.className = 'credits__hint';
    hint.textContent = ctx.t('credits.back');
    el.append(body, hint);

    return {
      el,
      focus() {},
      blur() {},
      handleKey: (key: Key): KeyResult => (key === 'back' ? 'back' : 'handled'),
      destroy() {},
    };
  },
});
