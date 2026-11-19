import { describe, expect, it } from 'vitest';
import { resolveTitleParams, type Catalog, type Title } from './catalog.ts';

const text = (title: string) => ({ title, overview: '', genres: [], metadataLine: [] });
const seed: Title = {
  id: 'tv:95396',
  source: 'tmdb',
  contentType: 'tv',
  year: 2022,
  rating: null,
  images: { poster: 'p', backdrop: 'b' },
  providers: [350],
  text: { en: text('Severance'), es: text('Separación') },
};
const catalog: Catalog = {
  generatedAt: '',
  region: 'US',
  titles: { [seed.id]: seed },
  providers: { '9': { id: 9, name: 'Prime Video', logo: '' } },
  sections: {},
  seeds: { byw: 'tv:95396' },
};

describe('resolveTitleParams', () => {
  it('resolves providers, the localized seed title and plain values', () => {
    const section = { id: 'byw', titleParams: { title: 'seed', provider: 'provider:9', n: '10' } };
    expect(resolveTitleParams(section, catalog, 'es')).toEqual({
      title: 'Separación',
      provider: 'Prime Video',
      n: '10',
    });
    expect(resolveTitleParams(section, catalog, 'en').title).toBe('Severance');
  });
});
