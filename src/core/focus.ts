/**
 * Focus engine. Knows only the module contract.
 * - VerticalFocus: the page's vertical order (header + sections). Routes keys to the
 *   focused item and moves on exit-up / exit-down. Nothing wraps.
 * - OverlayStack: overlays sit above the base layer; Back pops and focus restores.
 */
import type { FocusEntry, FocusMemory, Key, KeyResult, ModuleInstance } from './types.ts';

/** The subset of the contract the engine needs (instances may be created lazily). */
export type Focusable = Pick<ModuleInstance, 'focus' | 'blur' | 'handleKey'> & {
  focusable?(): boolean;
};

export interface VerticalFocusOptions {
  /** Item at index i (may create it on demand, for virtualized sections). */
  item: (index: number) => Focusable;
  count: () => number;
  /** Called after focus moves, so the view can animate. */
  onMove?: (from: number, to: number) => void;
  initial?: number;
}

export class VerticalFocus implements Focusable {
  index: number;
  private active = false;
  private readonly opts: VerticalFocusOptions;

  constructor(opts: VerticalFocusOptions) {
    this.opts = opts;
    this.index = opts.initial ?? 0;
  }

  focus(entry: FocusEntry = { from: 'initial' }): void {
    this.active = true;
    if (!this.isFocusable(this.index)) {
      const next = this.nextFocusable(this.index, 1) ?? this.nextFocusable(this.index, -1);
      if (next === null) return;
      this.index = next;
    }
    this.opts.item(this.index).focus(entry);
  }

  blur(): void {
    if (!this.active) return;
    this.active = false;
    this.opts.item(this.index).blur();
  }

  handleKey(key: Key): KeyResult {
    const result = this.opts.item(this.index).handleKey(key);
    if (result === 'exit-down') return this.move(1);
    if (result === 'exit-up') return this.move(-1);
    if (result === 'exit-left' || result === 'exit-right') return 'handled'; // edge: no wrap
    return result; // 'handled' or 'back'
  }

  /** Jump straight to an index (e.g. restoring after a page rebuild). */
  focusIndex(index: number): void {
    if (index === this.index || !this.isFocusable(index)) return;
    const from = this.index;
    if (this.active) this.opts.item(from).blur();
    this.index = index;
    if (this.active) this.opts.item(index).focus({ from: index > from ? 'up' : 'down' });
    this.opts.onMove?.(from, index);
  }

  private move(step: 1 | -1): KeyResult {
    const next = this.nextFocusable(this.index, step);
    if (next === null) return step === -1 ? 'exit-up' : 'handled';
    const from = this.index;
    this.opts.item(from).blur();
    this.index = next;
    // Moving down means focus arrives from above.
    this.opts.item(next).focus({ from: step === 1 ? 'up' : 'down' });
    this.opts.onMove?.(from, next);
    return 'handled';
  }

  private isFocusable(i: number): boolean {
    return i >= 0 && i < this.opts.count() && (this.opts.item(i).focusable?.() ?? true);
  }

  private nextFocusable(from: number, step: 1 | -1): number | null {
    for (let i = from + step; i >= 0 && i < this.opts.count(); i += step) {
      if (this.isFocusable(i)) return i;
    }
    return null;
  }
}

/** Base layer plus a stack of overlays. Keys go to the top; Back pops it. */
export class OverlayStack {
  private readonly stack: ModuleInstance[] = [];
  private readonly base: Focusable;
  private readonly host?: HTMLElement;

  constructor(base: Focusable, host?: HTMLElement) {
    this.base = base;
    this.host = host;
  }

  get depth(): number {
    return this.stack.length;
  }

  top(): Focusable {
    return this.stack[this.stack.length - 1] ?? this.base;
  }

  push(overlay: ModuleInstance): void {
    this.top().blur();
    this.stack.push(overlay);
    this.host?.append(overlay.el);
    overlay.focus({ from: 'initial' });
  }

  pop(): boolean {
    const overlay = this.stack.pop();
    if (!overlay) return false;
    overlay.blur();
    overlay.destroy();
    overlay.el.remove();
    this.top().focus({ from: 'restore' });
    return true;
  }

  clear(): void {
    while (this.stack.length) {
      const overlay = this.stack.pop()!;
      overlay.destroy();
      overlay.el.remove();
    }
  }

  handleKey(key: Key): KeyResult {
    const result = this.top().handleKey(key);
    if (result === 'back' && this.stack.length) {
      this.pop();
      return 'handled';
    }
    return result;
  }
}

export function createMemory(): FocusMemory {
  const map = new Map<string, unknown>();
  return {
    get: <T>(key: string) => map.get(key) as T | undefined,
    set: (key, value) => void map.set(key, value),
    clear: () => map.clear(),
  };
}
