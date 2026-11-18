/**
 * Row: a title and a strip of cards. Fixed-cursor horizontal scroll (the strip moves,
 * focus stays in the first slot), no wrap, per-row focus memory, images loaded ahead of focus.
 */
import { cards, sections, type CardInstance } from '../../core/app-registries.ts';
import { px } from '../../core/layout-tokens.ts';
import type { FocusEntry, Key, KeyResult } from '../../core/types.ts';

/** How many cards past the focused one get their images loaded. */
const LOOKAHEAD = 8;

sections.register({
  type: 'row',
  variant: 'default',
  label: 'Row',
  create(config, ctx) {
    const ids = ctx.catalog.sections[config.id] ?? [];
    const cardType = config.card ?? 'poster';
    const gap = px('layout', 'card-gap');
    const memoryKey = `row:${config.id}`;

    const el = document.createElement('section');
    el.className = `row row--${cardType}`;
    if (config.title) {
      const h = document.createElement('h2');
      h.className = 'row__title';
      const params = Object.fromEntries(
        Object.entries(config.titleParams ?? {}).map(([k, v]) => [
          k,
          v.startsWith('provider:') ? (ctx.catalog.providers[v.slice(9)]?.name ?? v) : v,
        ]),
      );
      h.textContent = ctx.t(config.title, params);
      el.append(h);
    }
    const strip = document.createElement('div');
    strip.className = 'row__strip';
    el.append(strip);

    const items: CardInstance[] = ids.map((id) => {
      const card = cards.get(cardType).create(id, ctx);
      strip.append(card.el);
      return card;
    });

    let index = Math.min(ctx.memory.get<number>(memoryKey) ?? 0, Math.max(items.length - 1, 0));
    let focused = false;

    const offsetOf = (i: number): number => items.slice(0, i).reduce((x, c) => x + c.width + gap, 0);

    function render(): void {
      strip.style.transform = `translateX(${-offsetOf(index)}px)`;
      items.forEach((card, i) => {
        card.el.classList.toggle('is-focused', focused && i === index);
        card.el.classList.toggle('is-past', i < index);
      });
      for (let i = 0; i <= Math.min(index + LOOKAHEAD, items.length - 1); i++) items[i]!.load();
    }

    function move(step: 1 | -1): KeyResult {
      const next = index + step;
      if (next < 0) return 'exit-left';
      if (next >= items.length) return 'exit-right';
      index = next;
      ctx.memory.set(memoryKey, index);
      render();
      return 'handled';
    }

    render();

    return {
      el,
      focusable: () => items.length > 0,
      focus(_entry?: FocusEntry) {
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
        switch (key) {
          case 'left':
            return move(-1);
          case 'right':
            return move(1);
          case 'up':
            return 'exit-up';
          case 'down':
            return 'exit-down';
          case 'ok':
            items[index]?.activate();
            return 'handled';
          case 'back':
            return 'back';
          default:
            return 'handled';
        }
      },
      destroy() {
        items.forEach((c) => c.destroy());
      },
    };
  },
});
