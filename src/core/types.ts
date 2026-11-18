/** Shared contracts. Spec: docs/SPEC.md, "Module contract". */
import type { Catalog, Title } from './catalog.ts';

/** App keys. 'moderator' comes from the moderator key sequence, not a single key. */
export type Key = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | 'playpause' | 'moderator';

export type KeyResult = 'handled' | 'exit-up' | 'exit-down' | 'exit-left' | 'exit-right' | 'back';

export type Direction = 'up' | 'down' | 'left' | 'right';

/** How focus arrives: from a direction, or restored after an overlay closes. */
export interface FocusEntry {
  from: Direction | 'restore' | 'initial';
}

/** Every focusable module (section, Display Page, overlay) implements this. */
export interface ModuleInstance {
  el: HTMLElement;
  focus(entry?: FocusEntry): void;
  blur(): void;
  handleKey(key: Key): KeyResult;
  destroy(): void;
  /** Optional: whether the module can take focus right now (default true). */
  focusable?(): boolean;
}

export interface OptionSchema {
  id: string;
  label: string; // i18n key
  kind: 'toggle' | 'selector';
  default: boolean | string;
  choices?: { id: string; label: string }[];
}

/** Per-section focus memory that survives virtualization; cleared on page switch. */
export interface FocusMemory {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  clear(): void;
}

/** What modules get from the app. */
export interface ModuleContext {
  catalog: Catalog;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: () => string;
  memory: FocusMemory;
  openTitle: (title: Title) => void;
  /** Push an overlay registered in the overlays registry (e.g. 'credits'). */
  openOverlay: (type: string, props?: Record<string, unknown>) => void;
  /** A module option's current value (moderator setting, else the schema default). */
  option: (type: string, id: string) => boolean | string | undefined;
}
