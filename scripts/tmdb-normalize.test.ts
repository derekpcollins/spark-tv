import { describe, expect, it } from 'vitest';
import {
  formatRuntime,
  normalizeSparkFree,
  normalizeTitle,
  pickImage,
  type TmdbDetail,
} from './tmdb-normalize.ts';

const img = (file_path: string, iso_639_1: string | null, vote_average = 5, width = 1000) => ({
  file_path,
  iso_639_1,
  vote_average,
  width,
});

const movie: TmdbDetail = {
  id: 603,
  title: 'The Matrix',
  overview: 'A hacker learns the truth.',
  release_date: '1999-03-31',
  runtime: 136,
  genres: [
    { id: 28, name: 'Action' },
    { id: 878, name: 'Science Fiction' },
    { id: 53, name: 'Thriller' },
  ],
  poster_path: '/p.jpg',
  backdrop_path: '/b.jpg',
  images: {
    logos: [img('/logo-fr.png', 'fr', 9), img('/logo-en.png', 'en', 5)],
    backdrops: [img('/b-en.jpg', 'en', 9), img('/b-none.jpg', null, 4)],
    posters: [img('/p-en.jpg', 'en')],
  },
  'watch/providers': {
    results: { US: { flatrate: [{ provider_id: 9 }] }, GB: { flatrate: [{ provider_id: 8 }] } },
  },
  release_dates: {
    results: [
      {
        iso_3166_1: 'US',
        release_dates: [
          { certification: '', type: 1 },
          { certification: 'R', type: 3 },
        ],
      },
    ],
  },
};

describe('normalizeTitle', () => {
  const t = normalizeTitle('movie', movie, {
    title: 'Matrix',
    overview: '',
    genres: [{ id: 28, name: 'Acción' }],
  });

  it('builds the id, year, runtime, rating and US providers', () => {
    expect(t.id).toBe('movie:603');
    expect(t.year).toBe(1999);
    expect(t.runtime).toBe(136);
    expect(t.rating).toBe('R');
    expect(t.providers).toEqual([9]);
  });

  it('prefers an English logo and a textless backdrop', () => {
    expect(t.images.logo).toBe('https://image.tmdb.org/t/p/w500/logo-en.png');
    expect(t.images.backdrop).toBe('https://image.tmdb.org/t/p/w1280/b-none.jpg');
    expect(t.images.poster).toBe('https://image.tmdb.org/t/p/w500/p-en.jpg');
  });

  it('localizes text and the metadata line, falling back to English when es is empty', () => {
    expect(t.text.en.metadataLine).toEqual([
      '1999',
      { kind: 'badge', text: 'R' },
      '2h 16m',
      'Action',
      'Science Fiction',
    ]);
    expect(t.text.es.title).toBe('Matrix');
    expect(t.text.es.overview).toBe('A hacker learns the truth.');
    expect(t.text.es.metadataLine).toEqual(['1999', { kind: 'badge', text: 'R' }, '2 h 16 min', 'Acción']);
  });
});

describe('helpers', () => {
  it('pickImage follows the language order', () => {
    expect(pickImage([img('/a', 'fr')], ['en', null])).toBeNull();
    expect(pickImage([img('/a', null), img('/b', 'en')], ['en', null])).toBe('/b');
  });

  it('formatRuntime handles under an hour', () => {
    expect(formatRuntime(45, 'en')).toBe('45m');
    expect(formatRuntime(45, 'es')).toBe('45 min');
  });
});

describe('normalizeSparkFree', () => {
  const film = {
    slug: 'spring',
    tmdb: 593048,
    file: 'spring.mp4',
    rating: 'PG',
    year: 2019,
    license: 'CC BY 4.0',
    credit: '(CC) Blender Foundation | studio.blender.org',
    trailer: { start: 0, duration: 30 },
    still: 10,
  };
  const keys = {
    trailer: 'sparkfree/spring/trailer.mp4',
    full: 'sparkfree/spring/film.mp4',
    backdrop: 'sparkfree/spring/backdrop.jpg',
  };
  const t = normalizeSparkFree(
    film,
    movie,
    { title: 'Primavera', overview: 'es', genres: [] },
    keys,
    'https://cdn.test',
  );

  it('uses its own still, only textless posters, and never a logo (Blender film logos are not CC-licensed)', () => {
    expect(t.images.logo).toBeNull();
    expect(t.images.backdrop).toBe('https://cdn.test/sparkfree/spring/backdrop.jpg');
    expect(t.images.poster).toBeNull(); // the only poster has English text
  });

  it('is a Spark Free title with video keys, credit and overrides, and no providers', () => {
    expect(t.id).toBe('sparkfree:spring');
    expect(t.source).toBe('sparkfree');
    expect(t.providers).toEqual([]);
    expect(t.video).toEqual({ trailer: keys.trailer, full: keys.full });
    expect(t.credit).toEqual({ line: film.credit, license: 'CC BY 4.0' });
    expect(t.rating).toBe('PG');
    expect(t.year).toBe(2019);
    expect(t.text.en.metadataLine).toContainEqual({ kind: 'badge', text: 'PG' });
    expect(t.text.es.title).toBe('Primavera');
  });
});
