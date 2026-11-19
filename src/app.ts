/**
 * App shell: canvas, keymap → overlay stack → page focus.
 * Flow: start screen → launch → Home (or straight to Home when the moderator skips the launch).
 * Moderator changes rebuild the page in place, keeping focus position and focus memory.
 */
import catalogData from '../data/catalog.json';
import layoutData from '../data/layout.json';
import { MODERATOR_SEQUENCE } from './config.ts';
import { cards, displayPages, overlays, sections } from './core/app-registries.ts';
import type { Catalog, Layout, SectionConfig, Title } from './core/catalog.ts';
import { createMemory, OverlayStack, type Focusable } from './core/focus.ts';
import { createI18n } from './core/i18n.ts';
import { bindKeys } from './core/keymap.ts';
import { createPage, type Page } from './core/page.ts';
import { browserPersistence, createStore, fromParams, resolveInitial } from './core/store.ts';
import type { ModuleContext, ModuleInstance } from './core/types.ts';
import { moderatorRows, variantFor } from './moderator.ts';
import './modules/index.ts';

const catalog = catalogData as unknown as Catalog;
const layout = layoutData as unknown as Layout;
const HEADER: SectionConfig = { id: 'header', type: 'header', source: { ids: [] } };

export function startApp(canvas: HTMLElement): void {
  const params = new URLSearchParams(location.search);
  const store = createStore(
    resolveInitial(browserPersistence.load(), fromParams(params)),
    browserPersistence,
  );
  browserPersistence.save(store.get()); // mirror the resolved condition to the URL right away

  const pageLayer = document.createElement('div');
  pageLayer.className = 'layer layer--page';
  const overlayLayer = document.createElement('div');
  overlayLayer.className = 'layer layer--overlays';
  canvas.append(pageLayer, overlayLayer);

  const memory = createMemory();
  const t = createI18n(() => store.get().locale);

  const ctx: ModuleContext = {
    catalog,
    t,
    locale: () => store.get().locale,
    memory,
    openTitle(title: Title) {
      const page = displayPages.get(title.contentType, variantFor(store, 'display', 'A')).create(title, ctx);
      page.el.classList.add('overlay');
      stack.push(page);
    },
    openOverlay(type, props = {}) {
      stack.push(overlays.get(type).create(props, ctx));
    },
    option(type, id) {
      const stored = store.get().options[`${type}.${id}`];
      if (stored !== undefined) return stored;
      const schema = [...sections.options(type), ...(cards.has(type) ? cards.options(type) : [])];
      return schema.find((o) => o.id === id)?.default;
    },
  };

  // Home sections with the moderator's variant choices applied.
  // A module that declares a `visible` option is left out entirely while it's off.
  const homeConfigs = (): SectionConfig[] =>
    [HEADER, ...(layout.pages.home?.sections ?? [])]
      .filter((c) => ctx.option(c.type, 'visible') !== false)
      .map((c) =>
        c.type === 'row' && c.card !== 'app' ? { ...c, card: variantFor(store, `row:${c.id}`, c.card) } : c,
      );
  const sectionVariant = (c: SectionConfig): string | undefined => variantFor(store, c.type, c.variant);

  let page: Page = createPage(pageLayer, homeConfigs(), ctx, sectionVariant);

  // The stack's base layer always points at the current page, so rebuilds are transparent.
  const base: Focusable = {
    focus: (entry) => page.focus(entry),
    blur: () => page.blur(),
    handleKey: (key) => page.handleKey(key),
  };
  const stack = new OverlayStack(base, overlayLayer);

  function rebuildPage(keepPosition: boolean): void {
    const index = keepPosition ? page.focusEngine.index : undefined;
    page.blur();
    page.destroy();
    page.el.remove();
    page = createPage(pageLayer, homeConfigs(), ctx, sectionVariant, index);
    if (stack.depth === 0) page.focus({ from: 'restore' });
  }

  store.subscribe((state, prev) => {
    document.documentElement.lang = state.locale;
    const pageChanged =
      state.locale !== prev.locale ||
      JSON.stringify(state.variants) !== JSON.stringify(prev.variants) ||
      JSON.stringify(state.options) !== JSON.stringify(prev.options);
    if (pageChanged) rebuildPage(true);
  });
  document.documentElement.lang = store.get().locale;

  let moderator: ModuleInstance | null = null;
  function toggleModerator(): void {
    if (moderator && stack.has((o) => o === moderator)) {
      stack.remove(moderator);
      moderator = null;
      return;
    }
    moderator = overlays.get('moderator').create(
      {
        rows: moderatorRows(store, layout.pages.home?.sections ?? [], t, resetSession),
        subscribe: (fn: () => void) => store.subscribe(fn),
      },
      ctx,
    );
    stack.push(moderator);
  }

  function showStart(): void {
    const start = overlays.get('start').create(
      {
        onStart() {
          const s = store.get();
          if (s.skipLaunch) {
            stack.remove(start);
            return;
          }
          const launch = overlays
            .get('launch')
            .create(
              { durationMs: s.launchDuration, sound: s.launchSound, onDone: () => stack.remove(launch) },
              ctx,
            );
          stack.replaceTop(launch);
        },
      },
      ctx,
    );
    stack.push(start);
  }

  /** Back to the start screen with a fresh session: no overlays, no focus memory, Home from the top. */
  function resetSession(): void {
    stack.clear();
    moderator = null;
    memory.clear();
    rebuildPage(false);
    page.blur();
    showStart();
  }

  if (store.get().skipLaunch) page.focus({ from: 'initial' });
  else showStart();
  if (params.get('moderator') === '1') toggleModerator();

  bindKeys(
    window,
    (key) => {
      if (key === 'moderator') return toggleModerator();
      const result = stack.handleKey(key);
      // Back on the moderator panel: the stack popped it, so forget the reference.
      if (moderator && !stack.has((o) => o === moderator)) moderator = null;
      void result;
    },
    undefined,
    MODERATOR_SEQUENCE,
  );
}
