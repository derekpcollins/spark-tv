/** Ad banner: live translated text, the Ad badge, its options schema, and OK doing nothing. */
import { beforeAll, describe, expect, it } from 'vitest';
import { sections } from '../../core/app-registries.ts';
import type { Catalog } from '../../core/catalog.ts';
import { createMemory } from '../../core/focus.ts';
import { createI18n } from '../../core/i18n.ts';
import type { ModuleContext } from '../../core/types.ts';

beforeAll(async () => {
  await import('../index.ts');
});

const ctx = (locale: 'en' | 'es', opened: string[] = []): ModuleContext => ({
  catalog: { generatedAt: '', region: 'US', titles: {}, providers: {}, sections: {} } as Catalog,
  t: createI18n(() => locale),
  locale: () => locale,
  memory: createMemory(),
  option: () => undefined,
  openOverlay: (type) => opened.push(type),
  openTitle: () => opened.push('title'),
});
const config = { id: 'ad', type: 'ad', variant: 'banner', ad: 'northwake', source: { ids: [] } };

describe('ad banner', () => {
  it('registers a banner variant with a show/hide option', () => {
    expect(sections.variants('ad').map((v) => v.id)).toEqual(['banner']);
    expect(sections.options('ad')).toEqual([
      { id: 'visible', label: 'opt.adVisible', kind: 'toggle', default: true },
    ]);
  });

  it('renders the name, tagline and badge as live, translated text', () => {
    const en = sections.get('ad', 'banner').create(config, ctx('en'));
    expect(en.el.querySelector('.ad__name')?.textContent).toBe('Northwake');
    expect(en.el.querySelector('.ad__tagline')?.textContent).toBe('Go where the morning starts.');
    expect(en.el.querySelector('.ad__badge')?.textContent).toBe('Ad');
    expect(en.el.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    const es = sections.get('ad', 'banner').create(config, ctx('es'));
    expect(es.el.querySelector('.ad__tagline')?.textContent).toBe('Ve donde empieza la mañana.');
    expect(es.el.querySelector('.ad__badge')?.textContent).toBe('Anuncio');
  });

  it('takes focus, and OK does nothing', () => {
    const opened: string[] = [];
    const ad = sections.get('ad', 'banner').create(config, ctx('en', opened));
    ad.focus({ from: 'initial' });
    expect(ad.el.querySelector('.ad__frame')?.classList.contains('is-focused')).toBe(true);
    expect(ad.handleKey('ok')).toBe('handled');
    expect(opened).toEqual([]);
    expect(ad.handleKey('down')).toBe('exit-down');
  });
});
