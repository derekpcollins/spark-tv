import { describe, expect, it } from 'vitest';
import { expandParams, interleave, mediaOf } from './sync-sources.ts';

describe('sync sources', () => {
  it('tells movie and tv endpoints apart', () => {
    expect(mediaOf('discover/tv')).toBe('tv');
    expect(mediaOf('tv/top_rated')).toBe('tv');
    expect(mediaOf('tv/95396/recommendations')).toBe('tv');
    expect(mediaOf('discover/movie')).toBe('movie');
    expect(mediaOf('trending/all/week')).toBe('movie');
  });

  it('expands @apps and a date window per media type', () => {
    const now = Date.UTC(2026, 10, 19);
    const opts = { appProviders: [8, 9], sinceDays: 60, now };
    expect(
      expandParams({ with_watch_providers: '@apps', sort_by: 'popularity.desc' }, 'movie', opts),
    ).toEqual({
      with_watch_providers: '8|9',
      sort_by: 'popularity.desc',
      'primary_release_date.gte': '2026-09-20',
      'primary_release_date.lte': '2026-11-19',
    });
    expect(expandParams({}, 'tv', opts)).toEqual({
      'first_air_date.gte': '2026-09-20',
      'first_air_date.lte': '2026-11-19',
    });
  });

  it('interleaves lists without duplicates', () => {
    expect(interleave([['a', 'b', 'c'], ['x', 'b'], []])).toEqual(['a', 'x', 'b', 'c']);
  });
});
