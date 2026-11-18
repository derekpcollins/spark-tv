import { describe, expect, it, vi } from 'vitest';
import { createMemory, OverlayStack, VerticalFocus, type Focusable } from './focus.ts';
import type { FocusEntry, Key, KeyResult, ModuleInstance } from './types.ts';

/** A row-like fake: `width` slots, exits at the edges. */
function fakeRow(width = 3, focusable = true) {
  const log: string[] = [];
  let x = 0;
  const item: Focusable & { log: string[]; x: () => number } = {
    log,
    x: () => x,
    focus: (e?: FocusEntry) => void log.push(`focus:${e?.from}`),
    blur: () => void log.push('blur'),
    focusable: () => focusable,
    handleKey(key: Key): KeyResult {
      if (key === 'up') return 'exit-up';
      if (key === 'down') return 'exit-down';
      if (key === 'left') return x === 0 ? 'exit-left' : (x--, 'handled');
      if (key === 'right') return x === width - 1 ? 'exit-right' : (x++, 'handled');
      if (key === 'back') return 'back';
      return 'handled';
    },
  };
  return item;
}

function page(...rows: ReturnType<typeof fakeRow>[]) {
  const onMove = vi.fn();
  const engine = new VerticalFocus({ item: (i) => rows[i]!, count: () => rows.length, onMove });
  return { engine, onMove };
}

describe('VerticalFocus', () => {
  it('moves down and up between rows and reports the direction focus came from', () => {
    const rows = [fakeRow(), fakeRow(), fakeRow()];
    const { engine, onMove } = page(...rows);
    engine.focus();
    expect(engine.handleKey('down')).toBe('handled');
    expect(engine.index).toBe(1);
    expect(rows[0]!.log).toEqual(['focus:initial', 'blur']);
    expect(rows[1]!.log).toEqual(['focus:up']);
    engine.handleKey('up');
    expect(engine.index).toBe(0);
    expect(rows[0]!.log.at(-1)).toBe('focus:down');
    expect(onMove).toHaveBeenNthCalledWith(1, 0, 1);
    expect(onMove).toHaveBeenNthCalledWith(2, 1, 0);
  });

  it('does not wrap: down on the last row and left/right at row edges stay put', () => {
    const rows = [fakeRow(2), fakeRow(2)];
    const { engine } = page(...rows);
    engine.focus();
    engine.handleKey('down');
    expect(engine.handleKey('down')).toBe('handled');
    expect(engine.index).toBe(1);
    expect(engine.handleKey('left')).toBe('handled');
    expect(rows[1]!.x()).toBe(0);
    engine.handleKey('right');
    engine.handleKey('right');
    expect(rows[1]!.x()).toBe(1);
  });

  it('reports exit-up from the top so a parent could take focus', () => {
    const { engine } = page(fakeRow(), fakeRow());
    engine.focus();
    expect(engine.handleKey('up')).toBe('exit-up');
  });

  it('skips rows that cannot take focus', () => {
    const rows = [fakeRow(), fakeRow(3, false), fakeRow()];
    const { engine } = page(...rows);
    engine.focus();
    engine.handleKey('down');
    expect(engine.index).toBe(2);
    expect(rows[1]!.log).toEqual([]);
  });

  it('passes back through to the caller', () => {
    const { engine } = page(fakeRow());
    engine.focus();
    expect(engine.handleKey('back')).toBe('back');
  });
});

function fakeOverlay(): ModuleInstance & { log: string[] } {
  const log: string[] = [];
  return {
    log,
    el: document.createElement('div'),
    focus: (e) => void log.push(`focus:${e?.from}`),
    blur: () => void log.push('blur'),
    handleKey: (key) => (key === 'back' ? 'back' : 'handled'),
    destroy: () => void log.push('destroy'),
  };
}

describe('OverlayStack', () => {
  it('routes keys to the top overlay and restores focus underneath on Back', () => {
    const rows = [fakeRow(), fakeRow()];
    const { engine } = page(...rows);
    const host = document.createElement('div');
    const stack = new OverlayStack(engine, host);
    engine.focus();
    engine.handleKey('down');

    const overlay = fakeOverlay();
    stack.push(overlay);
    expect(rows[1]!.log.at(-1)).toBe('blur');
    expect(host.contains(overlay.el)).toBe(true);

    expect(stack.handleKey('down')).toBe('handled');
    expect(engine.index).toBe(1); // the page didn't move under the overlay

    expect(stack.handleKey('back')).toBe('handled');
    expect(overlay.log).toEqual(['focus:initial', 'blur', 'destroy']);
    expect(host.contains(overlay.el)).toBe(false);
    expect(rows[1]!.log.at(-1)).toBe('focus:restore');
    expect(stack.depth).toBe(0);
  });

  it('pops nested overlays one at a time', () => {
    const { engine } = page(fakeRow());
    const stack = new OverlayStack(engine);
    const a = fakeOverlay();
    const b = fakeOverlay();
    stack.push(a);
    stack.push(b);
    stack.handleKey('back');
    expect(stack.depth).toBe(1);
    expect(a.log.at(-1)).toBe('focus:restore');
  });

  it('returns back from the base layer when no overlay is open', () => {
    const { engine } = page(fakeRow());
    const stack = new OverlayStack(engine);
    engine.focus();
    expect(stack.handleKey('back')).toBe('back');
  });

  it('clear() destroys every overlay without restoring focus', () => {
    const { engine } = page(fakeRow());
    const stack = new OverlayStack(engine);
    const a = fakeOverlay();
    stack.push(a);
    stack.clear();
    expect(stack.depth).toBe(0);
    expect(a.log).toContain('destroy');
  });
});

describe('focus memory', () => {
  it('stores per-key values and clears', () => {
    const m = createMemory();
    m.set('row:trending', 4);
    expect(m.get<number>('row:trending')).toBe(4);
    m.clear();
    expect(m.get('row:trending')).toBeUndefined();
  });
});
