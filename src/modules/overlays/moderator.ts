/**
 * Moderator panel: outside the fiction, visibly not part of the TV UI. Rows are built by
 * the app from the registries (see src/moderator.ts). Back closes it.
 *
 * The panel theme (dark by default, or light) is the facilitator's preference, not part of
 * a research condition: it lives in its own localStorage key, outside presets and the URL.
 */
import { overlays } from '../../core/app-registries.ts';
import { createSettingsList, type SettingRow } from '../../core/settings.ts';
import type { Key, KeyResult } from '../../core/types.ts';

export type PanelTheme = 'dark' | 'light';
const THEME_KEY = 'spark-tv:moderator-theme';

export function loadPanelTheme(): PanelTheme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function savePanelTheme(theme: PanelTheme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage unavailable (private mode): the choice lasts until the page reloads.
  }
}

overlays.register({
  type: 'moderator',
  variant: 'default',
  label: 'Moderator panel',
  create(props, ctx) {
    const subscribe = props.subscribe as (fn: () => void) => () => void;

    const el = document.createElement('div');
    let theme = loadPanelTheme();
    const applyTheme = (): void => {
      el.className = `overlay moderator${theme === 'dark' ? ' moderator--dark' : ''}`;
    };
    applyTheme();

    const rows: SettingRow[] = [
      ...(props.rows as SettingRow[]),
      { kind: 'heading', label: ctx.t('mod.panel') },
      {
        kind: 'selector',
        label: ctx.t('mod.theme'),
        choices: [
          { id: 'dark', label: ctx.t('mod.dark') },
          { id: 'light', label: ctx.t('mod.light') },
        ],
        value: () => theme,
        set: (id) => {
          theme = id === 'light' ? 'light' : 'dark';
          savePanelTheme(theme);
          applyTheme();
        },
      },
    ];

    const panel = document.createElement('div');
    panel.className = 'moderator__panel';
    const h = document.createElement('h1');
    h.className = 'moderator__title';
    h.textContent = ctx.t('mod.title');
    const list = createSettingsList(rows, { on: ctx.t('mod.on'), off: ctx.t('mod.off') });
    const hint = document.createElement('p');
    hint.className = 'moderator__hint';
    hint.textContent = ctx.t('mod.hint');
    panel.append(h, list.el, hint);
    el.append(panel);

    const unsubscribe = subscribe(() => list.refresh());

    return {
      el,
      focus: () => list.setFocused(true),
      blur: () => list.setFocused(false),
      handleKey: (key: Key): KeyResult => (key === 'moderator' ? 'back' : list.handleKey(key)),
      destroy: unsubscribe,
    };
  },
});
