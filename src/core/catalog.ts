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
  video?: { trailer: string; full: string };
}

export interface Catalog {
  generatedAt: string;
  region: string;
  titles: Record<string, Title>;
  providers: Record<string, Provider>;
  /** Resolved item ids per section: title ids, or 'app:sparkfree' / 'provider:<id>' for app rows. */
  sections: Record<string, string[]>;
}

export type SectionSource =
  | { tmdb: string; params?: Record<string, string> }
  | { ids: string[] }
  /** App tiles: 'sparkfree' or a TMDB watch-provider id. */
  | { apps: (string | number)[] };

export interface SectionConfig {
  id: string;
  type: string; // 'hero' | 'row' | 'banner'
  variant?: string; // default variant for this slot
  card?: string; // card type for rows
  title?: string; // i18n key
  titleParams?: Record<string, string>;
  source: SectionSource;
  limit?: number;
}

export interface Layout {
  pages: Record<string, { sections: SectionConfig[] }>;
}

export function localized(title: Title, locale: string): LocalizedText {
  return title.text[locale as Locale] ?? title.text.en;
}
