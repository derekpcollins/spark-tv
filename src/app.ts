/** App shell: canvas, keymap → overlay stack → page focus, Display Page overlays. */
import catalogData from '../data/catalog.json';
import layoutData from '../data/layout.json';
import { displayPages } from './core/app-registries.ts';
import type { Catalog, Layout, SectionConfig, Title } from './core/catalog.ts';
import { createMemory, OverlayStack } from './core/focus.ts';
import { createI18n } from './core/i18n.ts';
import { bindKeys } from './core/keymap.ts';
import { createPage } from './core/page.ts';
import type { ModuleContext } from './core/types.ts';
import './modules/index.ts';

const catalog = catalogData as unknown as Catalog;
const layout = layoutData as unknown as Layout;

export function startApp(canvas: HTMLElement): void {
  const params = new URLSearchParams(location.search);
  const locale = params.get('lang') === 'es' ? 'es' : 'en';
  document.documentElement.lang = locale;

  const pageLayer = document.createElement('div');
  pageLayer.className = 'layer layer--page';
  const overlayLayer = document.createElement('div');
  overlayLayer.className = 'layer layer--overlays';
  canvas.append(pageLayer, overlayLayer);

  const ctx: ModuleContext = {
    catalog,
    t: createI18n(() => locale),
    locale: () => locale,
    memory: createMemory(),
    options: {},
    openTitle(title: Title) {
      const page = displayPages.get(title.contentType, 'A').create(title, ctx);
      page.el.classList.add('overlay');
      stack.push(page);
    },
  };

  const header: SectionConfig = { id: 'header', type: 'header', source: { ids: [] } };
  const home = layout.pages.home?.sections ?? [];
  const page = createPage([header, ...home], ctx, (c) => c.variant);
  pageLayer.append(page.el);

  const stack = new OverlayStack(page, overlayLayer);
  page.focus({ from: 'initial' });

  bindKeys(window, (key) => {
    stack.handleKey(key);
  });

  // Locale is fixed per load in M1 (?lang=es); the moderator panel switches it live in M2.
}
