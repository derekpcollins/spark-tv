/**
 * One store with explicit setters. Moderator state (locale, variants, option toggles,
 * launch settings, active preset) is persisted to localStorage and mirrored to URL params,
 * so each research condition can be bookmarked. Session state (focus, overlay stack) lives
 * in the app and is never persisted.
 */
import { LAUNCH_TIMELINE_MS } from '../config.ts';
import type { Locale } from './catalog.ts';

export interface ModeratorState {
  locale: Locale;
  /** Slot id → variant id. Slots: 'hero', 'row:<sectionId>' (card type), 'display'. */
  variants: Record<string, string>;
  /** '<type>.<optionId>' → value. */
  options: Record<string, boolean | string>;
  launchSound: boolean;
  skipLaunch: boolean;
  launchDuration: number;
  preset: string | null;
}

export interface Preset {
  id: string;
  label: string;
  settings: Partial<Omit<ModeratorState, 'preset'>>;
}

export const DEFAULT_STATE: ModeratorState = {
  locale: 'en',
  variants: {},
  options: {},
  launchSound: true,
  skipLaunch: false,
  launchDuration: LAUNCH_TIMELINE_MS,
  preset: null,
};

const STORAGE_KEY = 'spark-tv:moderator';

type Listener = (state: ModeratorState, prev: ModeratorState) => void;

export interface Store {
  get(): ModeratorState;
  subscribe(fn: Listener): () => void;
  setLocale(locale: Locale): void;
  setVariant(slot: string, variant: string): void;
  setOption(key: string, value: boolean | string): void;
  setLaunchSound(on: boolean): void;
  setSkipLaunch(on: boolean): void;
  setLaunchDuration(ms: number): void;
  applyPreset(preset: Preset | null): void;
}

export interface Persistence {
  load(): Partial<ModeratorState>;
  save(state: ModeratorState): void;
}

export function createStore(initial: ModeratorState, persistence?: Persistence): Store {
  let state = initial;
  const listeners = new Set<Listener>();
  const commit = (next: ModeratorState): void => {
    const prev = state;
    state = next;
    persistence?.save(state);
    listeners.forEach((fn) => fn(state, prev));
  };
  // Any manual change means the session no longer matches the named preset.
  const edit = (patch: Partial<ModeratorState>): void => commit({ ...state, ...patch, preset: null });

  return {
    get: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setLocale: (locale) => edit({ locale }),
    setVariant: (slot, variant) => edit({ variants: { ...state.variants, [slot]: variant } }),
    setOption: (key, value) => edit({ options: { ...state.options, [key]: value } }),
    setLaunchSound: (launchSound) => edit({ launchSound }),
    setSkipLaunch: (skipLaunch) => edit({ skipLaunch }),
    setLaunchDuration: (launchDuration) => edit({ launchDuration }),
    applyPreset(preset) {
      if (!preset) return commit({ ...DEFAULT_STATE, preset: null });
      const s = preset.settings;
      commit({
        ...DEFAULT_STATE,
        ...s,
        variants: { ...s.variants },
        options: { ...s.options },
        preset: preset.id,
      });
    },
  };
}

/** URL params: lang, v.<slot>, o.<type.option>, sound, skip, dur, preset. */
export function toParams(state: ModeratorState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.preset) p.set('preset', state.preset);
  if (state.locale !== DEFAULT_STATE.locale) p.set('lang', state.locale);
  for (const [slot, v] of Object.entries(state.variants)) p.set(`v.${slot}`, v);
  for (const [key, v] of Object.entries(state.options)) p.set(`o.${key}`, String(v));
  if (state.launchSound !== DEFAULT_STATE.launchSound) p.set('sound', state.launchSound ? '1' : '0');
  if (state.skipLaunch !== DEFAULT_STATE.skipLaunch) p.set('skip', state.skipLaunch ? '1' : '0');
  if (state.launchDuration !== DEFAULT_STATE.launchDuration) p.set('dur', String(state.launchDuration));
  return p;
}

export function fromParams(p: URLSearchParams): Partial<ModeratorState> {
  const out: Partial<ModeratorState> = {};
  const lang = p.get('lang');
  if (lang === 'en' || lang === 'es') out.locale = lang;
  const variants: Record<string, string> = {};
  const options: Record<string, boolean | string> = {};
  for (const [k, v] of p) {
    if (k.startsWith('v.')) variants[k.slice(2)] = v;
    if (k.startsWith('o.')) options[k.slice(2)] = v === 'true' ? true : v === 'false' ? false : v;
  }
  if (Object.keys(variants).length) out.variants = variants;
  if (Object.keys(options).length) out.options = options;
  if (p.has('sound')) out.launchSound = p.get('sound') === '1';
  if (p.has('skip')) out.skipLaunch = p.get('skip') === '1';
  const dur = Number(p.get('dur'));
  if (dur > 0) out.launchDuration = dur;
  if (p.has('preset')) out.preset = p.get('preset');
  return out;
}

/** Initial state: defaults, then localStorage, then URL params (URL wins, so bookmarks work). */
export function resolveInitial(
  stored: Partial<ModeratorState>,
  url: Partial<ModeratorState>,
): ModeratorState {
  // Moderator keys in the URL describe a whole condition, so they replace stored state.
  const base = Object.keys(url).length ? DEFAULT_STATE : { ...DEFAULT_STATE, ...stored };
  return {
    ...base,
    ...url,
    variants: { ...(Object.keys(url).length ? {} : stored.variants), ...url.variants },
    options: { ...(Object.keys(url).length ? {} : stored.options), ...url.options },
  };
}

/** Browser persistence: localStorage plus the URL (replaceState, keeping non-moderator params). */
export const browserPersistence: Persistence = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<ModeratorState>;
    } catch {
      return {};
    }
  },
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: the URL still carries the condition */
    }
    const url = new URL(location.href);
    for (const k of [...url.searchParams.keys()]) {
      if (/^(lang|preset|sound|skip|dur|v\..+|o\..+)$/.test(k)) url.searchParams.delete(k);
    }
    for (const [k, v] of toParams(state)) url.searchParams.set(k, v);
    history.replaceState(null, '', url);
  },
};
