/** Pure helpers for resolving layout sources in scripts/sync.ts (no network, so they're testable). */

export type Media = 'movie' | 'tv';

/** 'discover/tv', 'tv/top_rated', 'tv/95396/recommendations' → tv; everything else → movie. */
export function mediaOf(path: string): Media {
  return /(^|\/)tv(\/|$)/.test(path) ? 'tv' : 'movie';
}

const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * Query params for one endpoint: "@apps" → the Apps row's provider ids ("|" = any of them), and
 * sinceDays → a release (movie) or first-air (tv) date window ending today.
 */
export function expandParams(
  params: Record<string, string> | undefined,
  media: Media,
  opts: { appProviders: number[]; sinceDays?: number; now?: number },
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params ?? {})) out[k] = v === '@apps' ? opts.appProviders.join('|') : v;
  if (opts.sinceDays) {
    const now = opts.now ?? Date.now();
    const field = media === 'movie' ? 'primary_release_date' : 'first_air_date';
    out[`${field}.gte`] = isoDay(now - opts.sinceDays * 86_400_000);
    out[`${field}.lte`] = isoDay(now);
  }
  return out;
}

/** Take one from each list in turn (keeping each list's own order), skipping duplicates. */
export function interleave(lists: string[][]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; lists.some((l) => i < l.length); i++) {
    for (const l of lists) {
      const id = l[i];
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}
