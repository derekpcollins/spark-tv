import { describe, expect, it, vi } from 'vitest';
import { createSequenceDetector } from './keymap.ts';
import { createSettingsList, type SettingRow } from './settings.ts';
import { createStore, DEFAULT_STATE, fromParams, resolveInitial, toParams, type Preset } from './store.ts';

describe('moderator store', () => {
  it('notifies with the previous state and persists every change', () => {
    const save = vi.fn();
    const store = createStore(DEFAULT_STATE, { load: () => ({}), save });
    const seen: string[] = [];
    store.subscribe((s, prev) => seen.push(`${prev.locale}->${s.locale}`));
    store.setLocale('es');
    expect(seen).toEqual(['en->es']);
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ locale: 'es' }));
  });

  it('applies a preset over defaults and clears it on any manual change', () => {
    const preset: Preset = {
      id: 'p',
      label: 'P',
      settings: { locale: 'es', variants: { hero: 'B' }, skipLaunch: true },
    };
    const store = createStore({ ...DEFAULT_STATE, launchSound: false });
    store.applyPreset(preset);
    expect(store.get()).toMatchObject({ locale: 'es', skipLaunch: true, launchSound: true, preset: 'p' });
    store.setVariant('row:trending', 'poster');
    expect(store.get().preset).toBeNull();
    expect(store.get().variants).toEqual({ hero: 'B', 'row:trending': 'poster' });
  });

  it('round-trips through URL params', () => {
    const state = {
      ...DEFAULT_STATE,
      locale: 'es' as const,
      variants: { hero: 'B', 'row:trending': 'poster' },
      options: { 'hero.dots': false },
      skipLaunch: true,
      launchDuration: 1800,
    };
    const params = toParams(state);
    expect(params.get('v.row:trending')).toBe('poster');
    expect(resolveInitial({}, fromParams(params))).toEqual(state);
  });

  it('lets URL params win over stored state so bookmarks reproduce a condition', () => {
    const stored = { locale: 'es' as const, variants: { hero: 'A' }, skipLaunch: true };
    expect(resolveInitial(stored, {})).toMatchObject({
      locale: 'es',
      skipLaunch: true,
      variants: { hero: 'A' },
    });
    const url = fromParams(new URLSearchParams('v.hero=B'));
    expect(resolveInitial(stored, url)).toMatchObject({
      locale: 'en',
      skipLaunch: false,
      variants: { hero: 'B' },
    });
  });
});

describe('moderator key sequence', () => {
  it('fires on M ×3 within the window, case-insensitive', () => {
    let now = 0;
    const detect = createSequenceDetector({ key: 'm', count: 3, windowMs: 1500 }, () => now);
    expect(detect('m')).toBe(false);
    now = 500;
    expect(detect('M')).toBe(false);
    now = 1000;
    expect(detect('m')).toBe(true);
  });

  it('resets when too slow or interrupted by another key', () => {
    let now = 0;
    const detect = createSequenceDetector({ key: 'm', count: 3, windowMs: 1500 }, () => now);
    detect('m');
    now = 1000;
    detect('m');
    now = 2600; // first press is now outside the window
    expect(detect('m')).toBe(false);
    detect('x');
    expect(detect('m')).toBe(false);
  });
});

describe('setting rows', () => {
  function rows() {
    const state = { lang: 'en', sound: true, ran: 0 };
    const list: SettingRow[] = [
      { kind: 'heading', label: 'General' },
      {
        kind: 'selector',
        label: 'Language',
        choices: [
          { id: 'en', label: 'English' },
          { id: 'es', label: 'Español' },
        ],
        value: () => state.lang,
        set: (id) => (state.lang = id),
      },
      { kind: 'toggle', label: 'Sound', value: () => state.sound, set: (on) => (state.sound = on) },
      { kind: 'info', label: 'Version', value: () => '1.0' },
      { kind: 'action', label: 'Reset', run: () => state.ran++ },
    ];
    return { state, ui: createSettingsList(list, { on: 'On', off: 'Off' }) };
  }

  it('starts on the first focusable row and changes selectors with Left/Right without wrapping', () => {
    const { state, ui } = rows();
    ui.handleKey('right');
    expect(state.lang).toBe('es');
    ui.handleKey('right');
    expect(state.lang).toBe('es');
    ui.handleKey('left');
    expect(state.lang).toBe('en');
  });

  it('toggles with OK, skips info rows, and runs actions', () => {
    const { state, ui } = rows();
    ui.handleKey('down');
    ui.handleKey('ok');
    expect(state.sound).toBe(false);
    ui.handleKey('down'); // skips the info row
    ui.handleKey('ok');
    expect(state.ran).toBe(1);
    expect(ui.handleKey('back')).toBe('back');
  });
});
