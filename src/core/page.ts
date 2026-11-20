/**
 * Page view: header + sections in one vertical track.
 * - Vertical row motion: the track translates so the focused section sits at the anchor;
 *   sections scrolled past fade out, sections below move up. Transform/opacity only.
 * - Heights are measured in one batch read when the page is built, and cached. A ResizeObserver
 *   re-measures if a live section's size changes later (a late font, say), batched per frame.
 * - Error boundary: a section whose module throws is replaced by an empty placeholder, so one
 *   broken section can't take the header or the rest of the page down with it.
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
  initialIndex?: number,
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
      try {
        const reg = sectionRegistry.get(slot.config.type, variantFor(slot.config));
        slot.instance = reg.create(slot.config, ctx);
      } catch (err) {
        console.error(`[page] section "${slot.config.id}" failed to render`, err);
        slot.instance = placeholder();
      }
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

  let maxScroll = 0;
  /** One batch read of the live sections' heights, then all the writes. Unmounted sections keep their cached height. */
  function measure(force = false): boolean {
    const heights = slots.map((s) => (s.instance ? s.el.offsetHeight : s.height));
    if (!force && heights.every((h, i) => h === slots[i]!.height)) return false;
    let y = 0;
    slots.forEach((s, i) => {
      s.height = heights[i] ?? 0;
      s.top = y;
      // The header overlaps the hero (the hero bleeds up behind it), so no gap after it.
      y += s.height + (s.config.type === 'header' ? 0 : gap);
    });
    slots.forEach((s) => (s.el.style.transform = `translateY(${s.top}px)`));
    // Never scroll past the point where the last section sits at the bottom safe area.
    const last = slots[slots.length - 1];
    maxScroll = Math.max(
      0,
      (last ? last.top + last.height : 0) + px('layout', 'bottom-safe') - CANVAS_HEIGHT,
    );
    return true;
  }

  // Mount everything once and measure.
  slots.forEach(mount);
  measure(true);

  const scrollFor = (i: number): number => Math.min(maxScroll, Math.max(0, (slots[i]?.top ?? 0) - anchor));

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
    initial: initialIndex ?? configs.findIndex((c) => c.type !== 'header'),
  });
  layout(focusEngine.index);

  let frame = 0;
  const resizes =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            if (measure()) layout(focusEngine.index);
          });
        });
  slots.forEach((s) => resizes?.observe(s.el));

  return {
    el,
    focusEngine,
    focus: (entry?: FocusEntry) => {
      layout(focusEngine.index);
      focusEngine.focus(entry);
    },
    blur: () => focusEngine.blur(),
    handleKey: (key: Key): KeyResult => focusEngine.handleKey(key),
    destroy: () => {
      resizes?.disconnect();
      cancelAnimationFrame(frame);
      slots.forEach(unmount);
    },
  };
}

/** Stand-in for a section that failed to render: takes no space and focus skips it. */
function placeholder(): ModuleInstance {
  const el = document.createElement('div');
  return {
    el,
    focusable: () => false,
    focus: () => {},
    blur: () => {},
    handleKey: (key: Key): KeyResult =>
      key === 'up' ? 'exit-up' : key === 'down' ? 'exit-down' : key === 'back' ? 'back' : 'handled',
    destroy: () => {},
  };
}
