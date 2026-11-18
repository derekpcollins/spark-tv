/** Full-width banner that opens the Credits screen. */
import { sections } from '../../core/app-registries.ts';
import { createMark } from '../../brand/mark.ts';
import type { Key, KeyResult } from '../../core/types.ts';

sections.register({
  type: 'banner',
  variant: 'credits',
  label: 'Credits banner',
  create(config, ctx) {
    const el = document.createElement('section');
    el.className = 'banner';
    const frame = document.createElement('div');
    frame.className = 'banner__frame button';
    frame.append(createMark({ size: 72, halo: false }));
    const text = document.createElement('div');
    text.className = 'banner__text';
    const title = document.createElement('div');
    title.className = 'banner__title';
    title.textContent = ctx.t(config.title ?? 'banner.credits');
    const sub = document.createElement('div');
    sub.className = 'banner__sub';
    sub.textContent = ctx.t('banner.creditsSub');
    text.append(title, sub);
    frame.append(text);
    el.append(frame);

    return {
      el,
      focus: () => frame.classList.add('is-focused'),
      blur: () => frame.classList.remove('is-focused'),
      handleKey(key: Key): KeyResult {
        if (key === 'ok') ctx.openOverlay('credits');
        if (key === 'up') return 'exit-up';
        if (key === 'down') return 'exit-down';
        if (key === 'back') return 'back';
        return 'handled';
      },
      destroy() {},
    };
  },
});
