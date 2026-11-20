/**
 * Integration: Home-like page with real modules. Covers LRUD, focus memory across
 * virtualization, and Display Page open → Back restores focus.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
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

const titles: Record<string, Title> = Object.fromEntries(
  [1, 2, 3, 4, 5, 6].map((n) => [`movie:${n}`, title(n)]),
);
titles['sparkfree:spring'] = {
  ...title(7),
  id: 'sparkfree:spring',
  source: 'sparkfree',
  providers: [],
  video: { trailer: 'sparkfree/spring/trailer.mp4', full: 'sparkfree/spring/film.mp4' },
  credit: { line: '© Blender Foundation | cloud.blender.org/spring', license: 'CC BY 4.0' },
};
const catalog: Catalog = {
  generatedAt: '',
  region: 'US',
  titles,
  providers: { '9': { id: 9, name: 'Prime Video', logo: 'l.png' } },
  sections: {
    hero: ['movie:1', 'movie:2'],
    apps: ['app:sparkfree', 'provider:9'],
    rowA: ['movie:3', 'movie:4', 'movie:5'],
    rowB: ['movie:6', 'movie:5', 'sparkfree:spring'],
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
  const overlaysOpened: { type: string; props: Record<string, unknown> }[] = [];
  const overlayHost = document.createElement('div');
  const ctx: ModuleContext = {
    catalog,
    t: createI18n(() => 'en'),
    locale: () => 'en',
    memory: createMemory(),
    option: () => undefined,
    openOverlay: (type, props = {}) => overlaysOpened.push({ type, props }),
    openTitle(t) {
      opened.push(t);
      stack.push(displayPages.get(t.contentType, 'A').create(t, ctx));
    },
  };
  const page = createPage(document.body, configs, ctx, (c) => c.variant);
  const stack = new OverlayStack(page, overlayHost);
  page.focus({ from: 'initial' });
  const press = (...keys: Parameters<OverlayStack['handleKey']>[0][]) =>
    keys.forEach((k) => stack.handleKey(k));
  const focusedCard = () => page.el.querySelector('.card.is-focused');
  return { page, stack, press, opened, overlaysOpened, overlayHost, focusedCard };
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

  it('wraps the hero carousel in both directions', () => {
    const { page, press } = setup();
    const heroText = () => page.el.querySelector('.hero')?.textContent ?? '';
    const first = heroText();
    press('left');
    const last = heroText();
    expect(last).not.toBe(first);
    press('right');
    expect(heroText()).toBe(first);
    press('right');
    expect(heroText()).toBe(last); // two slides: right from the first lands on the last
    press('right');
    expect(heroText()).toBe(first); // and wraps back around
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

  it('gives Spark Free titles a Play button and their credit, and Play opens the player', () => {
    const { press, opened, overlaysOpened, overlayHost } = setup();
    press('down', 'down', 'down', 'right', 'right', 'ok'); // rowB, third card
    expect(opened.map((t) => t.id)).toEqual(['sparkfree:spring']);
    const display = overlayHost.querySelector('.display');
    expect(display?.querySelector('.button--primary')?.textContent).toBe('Play');
    expect(display?.querySelector('.display__credit')?.textContent).toContain('CC BY 4.0');
    expect(display?.textContent).not.toContain('Watch on');
    press('ok');
    expect(overlaysOpened.map((o) => o.type)).toEqual(['player']);
    expect((overlaysOpened[0]?.props.title as Title).id).toBe('sparkfree:spring');
  });
});

describe('Home page resilience', () => {
  const ctxFor = (): ModuleContext => ({
    catalog,
    t: createI18n(() => 'en'),
    locale: () => 'en',
    memory: createMemory(),
    option: () => undefined,
    openOverlay: () => {},
    openTitle: () => {},
  });

  it('keeps the header and the other sections when one section throws', async () => {
    const { sections } = await import('./app-registries.ts');
    sections.register({
      type: 'test-broken',
      variant: 'default',
      label: 'Broken',
      create() {
        throw new Error('render failed');
      },
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.createElement('div');
    document.body.append(host);
    const page = createPage(
      host,
      [configs[0]!, { id: 'broken', type: 'test-broken', source: { ids: [] } }, ...configs.slice(2)],
      ctxFor(),
      (c) => c.variant,
    );
    page.focus({ from: 'initial' });
    expect(host.querySelector('.header')).not.toBeNull();
    expect(host.querySelectorAll('.page__slot--row .card').length).toBeGreaterThan(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('"broken"'), expect.any(Error));
    expect(page.focusEngine.index).toBe(2); // focus skips the broken slot and lands on Apps
    page.destroy();
    error.mockRestore();
  });

  it('re-measures and repositions sections when their size changes after the first measure', async () => {
    // Stand-in for the WebKit race: the first measure sees unstyled (too tall) sections.
    let unstyled = true;
    const size = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (!this.classList.contains('page__slot') || !this.firstElementChild) return 0;
      if (this.classList.contains('page__slot--header')) return unstyled ? 1944 : 132;
      return unstyled ? 900 : 300;
    });
    let observed: (() => void) | null = null;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          observed = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    const host = document.createElement('div');
    document.body.append(host);
    const page = createPage(host, configs, ctxFor(), (c) => c.variant);
    const hero = () => host.querySelector<HTMLElement>('.page__slot--hero')!;
    expect(hero().style.transform).toBe('translateY(1944px)');

    unstyled = false;
    observed!();
    expect(hero().style.transform).toBe('translateY(132px)');
    expect(host.querySelector<HTMLElement>('.page__track')!.style.transform).toBe('translateY(0px)');
    page.destroy();
    size.mockRestore();
    vi.unstubAllGlobals();
  });
});
