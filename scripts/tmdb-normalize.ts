/** Pure TMDB → catalog normalization (no network), so it can be unit-tested. */
import type { Locale, LocalizedText, MetadataItem, Provider, Title } from '../src/core/catalog.ts';

export const IMG = 'https://image.tmdb.org/t/p';

interface TmdbImage {
  file_path: string;
  iso_639_1: string | null;
  vote_average: number;
  width: number;
}

export interface TmdbDetail {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number | null;
  number_of_seasons?: number;
  genres: { id: number; name: string }[];
  poster_path: string | null;
  backdrop_path: string | null;
  images?: { logos: TmdbImage[]; backdrops: TmdbImage[]; posters: TmdbImage[] };
  'watch/providers'?: { results: Record<string, { flatrate?: { provider_id: number }[] }> };
  release_dates?: {
    results: { iso_3166_1: string; release_dates: { certification: string; type: number }[] }[];
  };
  content_ratings?: { results: { iso_3166_1: string; rating: string }[] };
}

/** Best image: language preference order, then votes, then width. */
export function pickImage(list: TmdbImage[] | undefined, langs: (string | null)[]): string | null {
  if (!list?.length) return null;
  for (const lang of langs) {
    const match = list
      .filter((i) => i.iso_639_1 === lang)
      .sort((a, b) => b.vote_average - a.vote_average || b.width - a.width)[0];
    if (match) return match.file_path;
  }
  return null;
}

export function usRating(d: TmdbDetail, region = 'US'): string | null {
  const tv = d.content_ratings?.results.find((r) => r.iso_3166_1 === region)?.rating;
  if (tv) return tv;
  const movie = d.release_dates?.results.find((r) => r.iso_3166_1 === region)?.release_dates ?? [];
  // Prefer theatrical (3), then any non-empty certification.
  const cert = movie.find((r) => r.type === 3 && r.certification) ?? movie.find((r) => r.certification);
  return cert?.certification || null;
}

export function formatRuntime(minutes: number, locale: Locale): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === 'es') return h ? `${h} h ${m} min` : `${m} min`;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function formatSeasons(n: number, locale: Locale): string {
  if (locale === 'es') return n === 1 ? '1 temporada' : `${n} temporadas`;
  return n === 1 ? '1 Season' : `${n} Seasons`;
}

export function metadataLine(
  t: Pick<Title, 'year' | 'rating' | 'runtime' | 'seasons'>,
  genres: string[],
  locale: Locale,
): MetadataItem[] {
  const items: MetadataItem[] = [];
  if (t.year) items.push(String(t.year));
  if (t.rating) items.push({ kind: 'badge', text: t.rating });
  if (t.runtime) items.push(formatRuntime(t.runtime, locale));
  if (t.seasons) items.push(formatSeasons(t.seasons, locale));
  items.push(...genres.slice(0, 2));
  return items;
}

export function normalizeTitle(
  contentType: 'movie' | 'tv',
  en: TmdbDetail,
  es: Pick<TmdbDetail, 'title' | 'name' | 'overview' | 'genres'>,
  region = 'US',
): Title {
  const date = en.release_date || en.first_air_date || '';
  const year = date ? Number(date.slice(0, 4)) : null;
  const base: Omit<Title, 'text'> = {
    id: `${contentType}:${en.id}`,
    source: 'tmdb',
    contentType,
    year,
    rating: usRating(en, region),
    ...(contentType === 'movie' && en.runtime ? { runtime: en.runtime } : {}),
    ...(contentType === 'tv' && en.number_of_seasons ? { seasons: en.number_of_seasons } : {}),
    images: {
      poster: imageUrl('w500', pickImage(en.images?.posters, ['en', null]) ?? en.poster_path),
      // Textless first, so the title logo can sit on top.
      backdrop: imageUrl('w1280', pickImage(en.images?.backdrops, [null, 'en']) ?? en.backdrop_path),
      logo: imageUrl('w500', pickImage(en.images?.logos, ['en', null])),
    },
    providers: (en['watch/providers']?.results[region]?.flatrate ?? []).map((p) => p.provider_id),
  };
  const text = (src: typeof es, locale: Locale): LocalizedText => {
    const genres = src.genres.map((g) => g.name);
    return {
      title: src.title ?? src.name ?? '',
      overview: src.overview,
      genres,
      metadataLine: metadataLine(base, genres, locale),
    };
  };
  const enText = text(en, 'en');
  const esText = text(es, 'es');
  // TMDB returns empty strings for missing translations; fall back to English.
  if (!esText.title) esText.title = enText.title;
  if (!esText.overview) esText.overview = enText.overview;
  return { ...base, text: { en: enText, es: esText } };
}

export function imageUrl(size: string, path: string | null | undefined): string | null {
  return path ? `${IMG}/${size}${path}` : null;
}

export function normalizeProvider(p: {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}): Provider {
  return { id: p.provider_id, name: p.provider_name, logo: imageUrl('w300', p.logo_path) ?? '' };
}
