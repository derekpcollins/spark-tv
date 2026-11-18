/**
 * Header: wordmark (no mark, per the brand), nav, profile. Left/Right move between items.
 * In Milestone 1 only Home is a live page; the other nav items take focus but don't switch.
 */
import { sections } from '../../core/app-registries.ts';
import { createWordmark } from '../../brand/wordmark.ts';
import type { Key, KeyResult } from '../../core/types.ts';

const NAV = ['nav.home', 'nav.movies', 'nav.shows', 'nav.sparkfree'];
const MEMORY_KEY = 'header';

sections.register({
  type: 'header',
  variant: 'default',
  label: 'Header',
  create(_config, ctx) {
    const el = document.createElement('header');
    el.className = 'header';
    el.append(createWordmark({ fontSize: 26, lockup: 'wordmark' }));

    const nav = document.createElement('nav');
    nav.className = 'header__nav';
    const items: HTMLElement[] = NAV.map((key, i) => {
      const item = document.createElement('span');
      item.className = 'header__item';
      item.textContent = ctx.t(key);
      if (i === 0) item.classList.add('is-current');
      nav.append(item);
      return item;
    });
    el.append(nav);

    const profile = document.createElement('span');
    profile.className = 'header__profile';
    profile.setAttribute('aria-label', ctx.t('nav.profile'));
    el.append(profile);
    items.push(profile);

    let index = ctx.memory.get<number>(MEMORY_KEY) ?? 0;
    let focused = false;
    const render = (): void =>
      items.forEach((it, i) => it.classList.toggle('is-focused', focused && i === index));

    return {
      el,
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
          if (next < 0 || next >= items.length) return key === 'left' ? 'exit-left' : 'exit-right';
          index = next;
          ctx.memory.set(MEMORY_KEY, index);
          render();
          return 'handled';
        }
        if (key === 'down') return 'exit-down';
        if (key === 'up') return 'exit-up';
        if (key === 'back') return 'back';
        return 'handled';
      },
      destroy() {},
    };
  },
});
