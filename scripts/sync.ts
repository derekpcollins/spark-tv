/**
 * npm run sync: resolve data/layout.json against TMDB and write data/catalog.json.
 * Reads TMDB_READ_TOKEN from .env.local. Never prints the token.
 * Images: include_image_language=en,null (title logos + textless backdrops). Region US.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Catalog, Layout, SectionConfig, Title } from '../src/core/catalog.ts';
import { normalizeProvider, normalizeTitle, type TmdbDetail } from './tmdb-normalize.ts';

const root = join(import.meta.dirname, '..');
const REGION = 'US';
const API = 'https://api.themoviedb.org/3';

if (existsSync(join(root, '.env.local'))) process.loadEnvFile(join(root, '.env.local'));
const token = process.env.TMDB_READ_TOKEN;
if (!token) {
  console.error('TMDB_READ_TOKEN is missing. Add it to .env.local (see .env.example).');
  process.exit(1);
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (res.status === 429 && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`TMDB ${res.status} for /${path}`);
    return (await res.json()) as T;
  }
}

/** Run tasks with limited concurrency. */
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

interface ListResult {
  results: { id: number; media_type?: string }[];
}

async function resolveSection(s: SectionConfig): Promise<string[]> {
  const src = s.source;
  if ('ids' in src) return src.ids;
  if ('apps' in src) return src.apps.map((id) => (typeof id === 'number' ? `provider:${id}` : `app:${id}`));
  const media = src.tmdb.includes('/tv') ? 'tv' : 'movie';
  const ids: string[] = [];
  for (let page = 1; ids.length < (s.limit ?? 20) && page <= 3; page++) {
    const list = await tmdb<ListResult>(src.tmdb, { language: 'en-US', page: String(page), ...src.params });
    for (const r of list.results) {
      const type = r.media_type ?? media;
      if (type === 'movie' || type === 'tv') ids.push(`${type}:${r.id}`);
    }
  }
  return ids.slice(0, s.limit ?? 20);
}

async function fetchTitle(id: string): Promise<Title | null> {
  const [type, num] = id.split(':') as ['movie' | 'tv', string];
  const extra = type === 'movie' ? 'release_dates' : 'content_ratings';
  try {
    const en = await tmdb<TmdbDetail>(`${type}/${num}`, {
      language: 'en-US',
      append_to_response: `images,watch/providers,${extra}`,
      include_image_language: 'en,null',
    });
    const es = await tmdb<TmdbDetail>(`${type}/${num}`, { language: 'es-ES' });
    return normalizeTitle(type, en, es, REGION);
  } catch (e) {
    console.warn(`  skipped ${id}: ${(e as Error).message}`);
    return null;
  }
}

async function main(): Promise<void> {
  const layout = JSON.parse(readFileSync(join(root, 'data/layout.json'), 'utf8')) as Layout;
  const sections: Catalog['sections'] = {};
  const allSections = Object.values(layout.pages).flatMap((p) => p.sections);

  console.log(`Resolving ${allSections.length} sections…`);
  for (const s of allSections) sections[s.id] = await resolveSection(s);

  const titleIds = [
    ...new Set(
      Object.values(sections)
        .flat()
        .filter((id) => !id.startsWith('provider:')),
    ),
  ];
  console.log(`Fetching ${titleIds.length} titles (en-US + es-ES)…`);
  const fetched = await pool(titleIds, 4, fetchTitle);
  const titles: Catalog['titles'] = {};
  for (const t of fetched) if (t) titles[t.id] = t;

  // Drop titles we couldn't fetch, and titles with no usable artwork.
  for (const [sid, ids] of Object.entries(sections)) {
    sections[sid] = ids.filter(
      (id) =>
        id.startsWith('provider:') ||
        id.startsWith('app:') ||
        (titles[id]?.images.backdrop && titles[id]?.images.poster),
    );
  }

  console.log('Fetching US watch providers…');
  const lists = await Promise.all(
    ['movie', 'tv'].map((m) =>
      tmdb<{ results: Parameters<typeof normalizeProvider>[0][] }>(`watch/providers/${m}`, {
        language: 'en-US',
        watch_region: REGION,
      }),
    ),
  );
  const allProviders = new Map(
    lists.flatMap((l) => l.results).map((p) => [p.provider_id, normalizeProvider(p)]),
  );
  const wanted = new Set<number>([
    ...Object.values(sections)
      .flat()
      .filter((id) => id.startsWith('provider:'))
      .map((id) => Number(id.slice(9))),
    ...Object.values(titles).flatMap((t) => t.providers),
  ]);
  const providers: Catalog['providers'] = {};
  for (const id of wanted) {
    const p = allProviders.get(id);
    if (p) providers[id] = p;
  }
  for (const [sid, ids] of Object.entries(sections)) {
    const missing = ids.filter((id) => id.startsWith('provider:') && !providers[id.slice(9)]);
    if (missing.length) console.warn(`  ${sid}: unknown provider ids ${missing.join(', ')}`);
    sections[sid] = ids.filter((id) => !id.startsWith('provider:') || providers[id.slice(9)]);
  }

  const catalog: Catalog = {
    generatedAt: new Date().toISOString(),
    region: REGION,
    titles,
    providers,
    sections,
  };
  writeFileSync(join(root, 'data/catalog.json'), JSON.stringify(catalog, null, 1) + '\n');
  console.log(
    `Wrote data/catalog.json: ${Object.keys(titles).length} titles, ${Object.keys(providers).length} providers.`,
  );
  for (const [sid, ids] of Object.entries(sections)) console.log(`  ${sid}: ${ids.length}`);
}

await main();
