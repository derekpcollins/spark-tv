/**
 * Moderator panel: outside the fiction, visibly not part of the TV UI. Rows are built by
 * the app from the registries (see src/moderator.ts). Back closes it.
 */
import { overlays } from '../../core/app-registries.ts';
import { createSettingsList, type SettingRow } from '../../core/settings.ts';
import type { Key, KeyResult } from '../../core/types.ts';

overlays.register({
  type: 'moderator',
  variant: 'default',
  label: 'Moderator panel',
  create(props, ctx) {
    const rows = props.rows as SettingRow[];
    const subscribe = props.subscribe as (fn: () => void) => () => void;

    const el = document.createElement('div');
    el.className = 'overlay moderator';
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
