/**
 * Page view: header + sections in one vertical track.
 * - Vertical row motion: the track translates so the focused section sits at the anchor;
 *   sections scrolled past fade out, sections below move up. Transform/opacity only.
 * - Heights are measured in one batch read when the page is built, and cached.
 * - Virtualization: only sections near the viewport (plus focused ±1) are live in the DOM.
 * - Dim: sections without focus sit at the dim opacity.
 */
import { sections as sectionRegistry } from './app-registries.ts';
import type { SectionConfig } from './catalog.ts';
import { CANVAS_HEIGHT } from './canvas.ts';
import { VerticalFocus, type Focusable } from './focus.ts';
import { px } from './layout-tokens.ts';
import type { FocusEntry, Key, KeyResult, ModuleContext, ModuleInstance } from './types.ts';

export interface Page extends Focusable {
  el: HTMLElement;
  focusEngine: VerticalFocus;
  destroy(): void;
}

interface Slot {
  config: SectionConfig;
  el: HTMLElement; // positioned wrapper, always in the DOM
  instance: ModuleInstance | null;
  top: number;
  height: number;
}

/** `host` must be in the document: heights are measured right after mounting. */
export function createPage(
  host: HTMLElement,
  configs: SectionConfig[],
  ctx: ModuleContext,
  variantFor: (c: SectionConfig) => string | undefined,
): Page {
  const el = document.createElement('div');
  el.className = 'page';
  const track = document.createElement('div');
  track.className = 'page__track';
  el.append(track);
  host.append(el);

  const anchor = px('layout', 'row-anchor');
  const gap = px('layout', 'row-gap');
  const buffer = px('layout', 'window-buffer');

  const slots: Slot[] = configs.map((config) => {
    const wrap = document.createElement('div');
    wrap.className = `page__slot page__slot--${config.type}`;
    track.append(wrap);
    return { config, el: wrap, instance: null, top: 0, height: 0 };
  });

  const mount = (slot: Slot): ModuleInstance => {
    if (!slot.instance) {
      const reg = sectionRegistry.get(slot.config.type, variantFor(slot.config));
      slot.instance = reg.create(slot.config, ctx);
      slot.el.append(slot.instance.el);
    }
    return slot.instance;
  };
  const unmount = (slot: Slot): void => {
    if (!slot.instance) return;
    slot.instance.destroy();
    slot.instance.el.remove();
    slot.instance = null;
  };

  // Mount everything once, then measure in one batch read (no writes in between).
  slots.forEach(mount);
  const heights = slots.map((s) => s.el.offsetHeight);
  let y = 0;
  slots.forEach((s, i) => {
    s.height = heights[i] ?? 0;
    s.top = y;
    // The header overlaps the hero (the hero bleeds up behind it), so no gap after it.
    y += s.height + (s.config.type === 'header' ? 0 : gap);
  });
  slots.forEach((s) => (s.el.style.transform = `translateY(${s.top}px)`));

  const scrollFor = (i: number): number => Math.max(0, (slots[i]?.top ?? 0) - anchor);

  function layout(focusIndex: number): void {
    const scroll = scrollFor(focusIndex);
    track.style.transform = `translateY(${-scroll}px)`;
    const lo = scroll - buffer;
    const hi = scroll + CANVAS_HEIGHT + buffer;
    slots.forEach((s, i) => {
      const near = Math.abs(i - focusIndex) <= 1;
      const visible = s.top + s.height > lo && s.top < hi;
      if (near || visible) mount(s);
      else unmount(s);
      const scrolledPast = s.top + s.height <= scroll + anchor / 2 && i < focusIndex;
      s.el.classList.toggle('is-past', scrolledPast);
      s.el.classList.toggle('is-dim', !scrolledPast && i !== focusIndex);
    });
  }

  const focusEngine = new VerticalFocus({
    item: (i) => mount(slots[i]!),
    count: () => slots.length,
    onMove: (_from, to) => layout(to),
    initial: configs.findIndex((c) => c.type !== 'header'),
  });
  layout(focusEngine.index);

  return {
    el,
    focusEngine,
    focus: (entry?: FocusEntry) => {
      layout(focusEngine.index);
      focusEngine.focus(entry);
    },
    blur: () => focusEngine.blur(),
    handleKey: (key: Key): KeyResult => focusEngine.handleKey(key),
    destroy: () => slots.forEach(unmount),
  };
}
