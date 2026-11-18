/** The four registries. Modules import these and register themselves. */
import type { SectionConfig, Title } from './catalog.ts';
import { createRegistry } from './registry.ts';
import type { ModuleContext, ModuleInstance } from './types.ts';

export type SectionFactory = (config: SectionConfig, ctx: ModuleContext) => ModuleInstance;

/** Cards are display-only: the row owns focus and tells the card when it's focused. */
export interface CardInstance {
  el: HTMLElement;
  width: number;
  /** Set image sources (called just ahead of focus). */
  load(): void;
  /** Open on OK; return false if the card is inert (e.g. app tiles). */
  activate(): boolean;
  destroy(): void;
}
export type CardFactory = (itemId: string, ctx: ModuleContext) => CardInstance;

export type DisplayPageFactory = (title: Title, ctx: ModuleContext) => ModuleInstance;
export type OverlayFactory = (props: Record<string, unknown>, ctx: ModuleContext) => ModuleInstance;

export const sections = createRegistry<SectionFactory>('sections');
export const cards = createRegistry<CardFactory>('cards');
/** Keyed by contentType ('movie' | 'tv') + variant ('A' | 'B'). */
export const displayPages = createRegistry<DisplayPageFactory>('displayPages');
export const overlays = createRegistry<OverlayFactory>('overlays');
