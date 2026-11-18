/**
 * Integration: Home-like page with real modules. Covers LRUD, focus memory across
 * virtualization, and Display Page open → Back restores focus.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { Catalog, SectionConfig, Title } from './catalog.ts';
import { displayPages } from './app-registries.ts';
import { createMemory, OverlayStack } from './focus.ts';
import { createI18n } from './i18n.ts';
import { createPage } from './page.ts';
import type { ModuleContext } from './types.ts';

beforeAll(async () => {
  await import('../modules/index.ts');
});

function title(n: number): Title {
  const text = { title: `Title ${n}`, overview: '', genres: [], metadataLine: ['2024'] };
  return {
    id: `movie:${n}`,
    source: 'tmdb',
    contentType: 'movie',
    year: 2024,
    rating: null,
    images: { poster: `p${n}.jpg`, backdrop: `b${n}.jpg`, logo: null },
    providers: [9],
    text: { en: text, es: text },
  };
}

const titles = Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`movie:${n}`, title(n)]));
const catalog: Catalog = {
  generatedAt: '',
  region: 'US',
  titles,
  providers: { '9': { id: 9, name: 'Prime Video', logo: 'l.png' } },
  sections: {
    hero: ['movie:1', 'movie:2'],
    apps: ['app:sparkfree', 'provider:9'],
    rowA: ['movie:3', 'movie:4', 'movie:5'],
    rowB: ['movie:6', 'movie:5'],
  },
};
const configs: SectionConfig[] = [
  { id: 'header', type: 'header', source: { ids: [] } },
  { id: 'hero', type: 'hero', variant: 'B', source: { ids: [] } },
  { id: 'apps', type: 'row', card: 'app', source: { apps: [] } },
  { id: 'rowA', type: 'row', card: 'landscape', source: { ids: [] } },
  { id: 'rowB', type: 'row', card: 'poster', source: { ids: [] } },
];

function setup() {
  const opened: Title[] = [];
  const overlayHost = document.createElement('div');
  const ctx: ModuleContext = {
    catalog,
    t: createI18n(() => 'en'),
    locale: () => 'en',
    memory: createMemory(),
    options: {},
    openTitle(t) {
      opened.push(t);
      stack.push(displayPages.get(t.contentType, 'A').create(t, ctx));
    },
  };
  const page = createPage(configs, ctx, (c) => c.variant);
  const stack = new OverlayStack(page, overlayHost);
  page.focus({ from: 'initial' });
  const press = (...keys: Parameters<OverlayStack['handleKey']>[0][]) =>
    keys.forEach((k) => stack.handleKey(k));
  const focusedCard = () => page.el.querySelector('.card.is-focused');
  return { page, stack, press, opened, overlayHost, focusedCard };
}

describe('Home page integration', () => {
  it('starts on the hero, not the header', () => {
    const { page } = setup();
    expect(page.focusEngine.index).toBe(1);
  });

  it('moves through header, hero and rows with LRUD and no wrap', () => {
    const { page, press, focusedCard } = setup();
    press('up');
    expect(page.focusEngine.index).toBe(0);
    press('up');
    expect(page.focusEngine.index).toBe(0);
    press('down', 'down', 'down');
    expect(page.focusEngine.index).toBe(3);
    press('right', 'right', 'right', 'right');
    expect(focusedCard()?.textContent).toBe('Title 5'); // stopped at the end
  });

  it('remembers each row’s position when focus leaves and returns', () => {
    const { page, press, focusedCard } = setup();
    press('down', 'down', 'right'); // rowA, second card
    press('down'); // rowB
    expect(page.focusEngine.index).toBe(4);
    press('up');
    expect(focusedCard()?.textContent).toBe('Title 4');
  });

  it('opens the Display Page on OK and Back restores focus to the same card', () => {
    const { page, stack, press, opened, overlayHost, focusedCard } = setup();
    press('down', 'down', 'right', 'ok');
    expect(opened.map((t) => t.id)).toEqual(['movie:4']);
    expect(stack.depth).toBe(1);
    expect(overlayHost.querySelector('.display')?.textContent).toContain('Watch on Prime Video');
    press('down', 'left'); // keys go to the overlay, not the page
    press('back');
    expect(stack.depth).toBe(0);
    expect(page.focusEngine.index).toBe(3);
    expect(focusedCard()?.textContent).toBe('Title 4');
  });

  it('app tiles take focus but OK does nothing', () => {
    const { stack, press, opened } = setup();
    press('down', 'ok', 'right', 'ok');
    expect(opened).toEqual([]);
    expect(stack.depth).toBe(0);
  });
});
