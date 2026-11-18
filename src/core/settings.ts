/**
 * Config-driven setting rows (selector, toggle, action, info), used by the moderator panel.
 * Up/Down move between rows; Left/Right change a selector or toggle; OK toggles or runs.
 */
import type { Key, KeyResult } from './types.ts';

export type SettingRow =
  | { kind: 'heading'; label: string }
  | {
      kind: 'selector';
      label: string;
      choices: { id: string; label: string }[];
      value: () => string;
      set: (id: string) => void;
    }
  | { kind: 'toggle'; label: string; value: () => boolean; set: (on: boolean) => void }
  | { kind: 'action'; label: string; run: () => void }
  | { kind: 'info'; label: string; value: () => string };

export interface SettingsList {
  el: HTMLElement;
  setFocused(on: boolean): void;
  handleKey(key: Key): KeyResult;
  refresh(): void;
}

const focusable = (r: SettingRow): boolean => r.kind !== 'heading' && r.kind !== 'info';

export function createSettingsList(rows: SettingRow[], onLabel: { on: string; off: string }): SettingsList {
  const el = document.createElement('div');
  el.className = 'settings';
  const list = document.createElement('div');
  list.className = 'settings__list';
  el.append(list);

  const rowEls = rows.map((row) => {
    const r = document.createElement('div');
    r.className = `settings__row settings__row--${row.kind}`;
    const label = document.createElement('span');
    label.className = 'settings__label';
    label.textContent = row.label;
    const value = document.createElement('span');
    value.className = 'settings__value';
    r.append(label, value);
    list.append(r);
    return { r, value };
  });

  let index = rows.findIndex(focusable);
  let focused = false;

  function valueText(row: SettingRow): string {
    switch (row.kind) {
      case 'selector': {
        const id = row.value();
        const label = row.choices.find((c) => c.id === id)?.label ?? id;
        return row.choices.length > 1 ? `‹ ${label} ›` : label;
      }
      case 'toggle':
        return row.value() ? onLabel.on : onLabel.off;
      case 'info':
        return row.value();
      default:
        return '';
    }
  }

  function refresh(): void {
    rows.forEach((row, i) => {
      const { r, value } = rowEls[i]!;
      value.textContent = valueText(row);
      r.classList.toggle('is-focused', focused && i === index);
    });
    // Keep the focused row in view: batch the read, then write.
    const row = rowEls[index]?.r;
    if (row) {
      const top = row.offsetTop;
      const viewport = el.offsetHeight;
      const shift = Math.max(0, top - viewport / 2);
      list.style.transform = `translateY(${-shift}px)`;
    }
  }

  function step(dir: 1 | -1): void {
    for (let i = index + dir; i >= 0 && i < rows.length; i += dir) {
      if (focusable(rows[i]!)) {
        index = i;
        return;
      }
    }
  }

  function change(dir: 1 | -1): void {
    const row = rows[index];
    if (!row) return;
    if (row.kind === 'selector') {
      const i = row.choices.findIndex((c) => c.id === row.value());
      const next = row.choices[Math.min(row.choices.length - 1, Math.max(0, i + dir))];
      if (next && next.id !== row.value()) row.set(next.id);
    } else if (row.kind === 'toggle') {
      row.set(!row.value());
    }
  }

  refresh();
  return {
    el,
    refresh,
    setFocused(on) {
      focused = on;
      refresh();
    },
    handleKey(key) {
      const row = rows[index];
      if (key === 'up') step(-1);
      else if (key === 'down') step(1);
      else if (key === 'left') change(-1);
      else if (key === 'right') change(1);
      else if (key === 'ok') {
        if (row?.kind === 'toggle') row.set(!row.value());
        else if (row?.kind === 'action') row.run();
        else if (row?.kind === 'selector') change(1);
      } else if (key === 'back') return 'back';
      refresh();
      return 'handled';
    },
  };
}
