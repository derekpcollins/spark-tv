/** Catalog and layout data shapes. Spec: docs/SPEC.md, "Data". */
export type Locale = 'en' | 'es';

export type MetadataItem =
  | string
  | { kind: 'text'; text: string }
  | { kind: 'badge'; text: string }
  | { kind: 'icon'; name: string }
  | { kind: 'image'; src: string; alt: string };

export interface LocalizedText {
  title: string;
  overview: string;
  genres: string[];
  metadataLine: MetadataItem[];
}

export interface Provider {
  id: number;
  name: string;
  logo: string;
}

export interface Title {
  id: string; // "movie:603", "tv:1399", "sparkfree:sprite-fright"
  source: 'tmdb' | 'sparkfree';
  contentType: 'movie' | 'tv';
  year: number | null;
  runtime?: number; // minutes (movies)
  seasons?: number; // (tv)
  rating: string | null; // US certification, e.g. "PG-13"
  images: { poster: string | null; backdrop: string | null; logo?: string | null };
  providers: number[]; // Provider ids (US flatrate)
  text: Record<Locale, LocalizedText>;
  /** R2 keys, relative to ASSET_BASE_URL (Spark Free only). */
  video?: { trailer: string; full: string };
  /** CC attribution (Spark Free only). */
  credit?: { line: string; license: string; extra?: string };
}

export interface Catalog {
  generatedAt: string;
  region: string;
  titles: Record<string, Title>;
  providers: Record<string, Provider>;
  /** Resolved item ids per section: title ids, or 'app:sparkfree' / 'provider:<id>' for app rows. */
  sections: Record<string, string[]>;
  /** Section id → the title a recommendations row was built from (for "Because You Watched {title}"). */
  seeds?: Record<string, string>;
}

export type SectionSource =
  /**
   * A TMDB list endpoint, or several interleaved (e.g. discover/movie + discover/tv).
   * A param value of "@apps" becomes the Apps row's provider ids joined with "|".
   * sinceDays limits to titles released (movie) or first aired (tv) in the last N days.
   */
  | { tmdb: string | string[]; params?: Record<string, string>; sinceDays?: number }
  /** TMDB recommendations for the first title of `section` if it exists and has items, else for `id`. */
  | { recommendations: { section?: string; id: string } }
  | { ids: string[] }
  /** App tiles: 'sparkfree' or a TMDB watch-provider id. */
  | { apps: (string | number)[] }
  /** Every Spark Free film, in data/sparkfree.json order. */
  | { sparkfree: true };

export interface SectionConfig {
  id: string;
  type: string; // 'hero' | 'row' | 'banner'
  variant?: string; // default variant for this slot
  card?: string; // card type for rows
  title?: string; // i18n key
  titleParams?: Record<string, string>;
  source: SectionSource;
  limit?: number;
  /** Ad sections: which advertiser (see src/modules/sections/ad.ts). */
  ad?: string;
  /** Drop titles not streaming (US flatrate) on a service in the Apps row. */
  requireProvider?: boolean;
}

export interface Layout {
  pages: Record<string, { sections: SectionConfig[] }>;
}

/**
 * Row title params: "provider:<id>" → the provider's name, "seed" → the localized title the
 * section's recommendations were built from; anything else is used as is.
 */
export function resolveTitleParams(
  section: Pick<SectionConfig, 'id' | 'titleParams'>,
  catalog: Catalog,
  locale: string,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(section.titleParams ?? {}).map(([k, v]) => {
      if (v.startsWith('provider:')) return [k, catalog.providers[v.slice(9)]?.name ?? v];
      if (v === 'seed') {
        const seed = catalog.titles[catalog.seeds?.[section.id] ?? ''];
        return [k, seed ? localized(seed, locale).title : ''];
      }
      return [k, v];
    }),
  );
}

export function localized(title: Title, locale: string): LocalizedText {
  return title.text[locale as Locale] ?? title.text.en;
}
