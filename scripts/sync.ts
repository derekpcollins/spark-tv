/**
 * npm run sync: resolve data/layout.json against TMDB and write data/catalog.json.
 * Reads TMDB_READ_TOKEN from .env.local. Never prints the token.
 * Images: include_image_language=en,null (title logos + textless backdrops). Region US.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Catalog, Layout, SectionConfig, Title } from '../src/core/catalog.ts';
import { ASSET_BASE_URL } from '../src/config.ts';
import { films, mediaKeys } from './sparkfree.ts';
import { expandParams, interleave, mediaOf } from './sync-sources.ts';
import { normalizeProvider, normalizeSparkFree, normalizeTitle, type TmdbDetail } from './tmdb-normalize.ts';

const root = join(import.meta.dirname, '..');
const REGION = 'US';
/** Ad tiers and alternate plans that should count as the main service. */
const PROVIDER_ALIASES: Record<number, number> = { 1796: 8, 2100: 9, 2616: 2303 };
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
  total_pages?: number;
}

/** Rows that must survive the provider and artwork filters fetch extra candidates. */
const OVERFETCH = 3;
const MAX_PAGES = 5;

interface ResolveContext {
  appProviders: number[];
  sections: Catalog['sections'];
  seeds: Record<string, string>;
}

async function listIds(path: string, params: Record<string, string>, want: number): Promise<string[]> {
  const media = mediaOf(path);
  const ids: string[] = [];
  for (let page = 1; ids.length < want && page <= MAX_PAGES; page++) {
    const list = await tmdb<ListResult>(path, { language: 'en-US', ...params, page: String(page) });
    for (const r of list.results) {
      const type = r.media_type ?? media;
      if (type === 'movie' || type === 'tv') ids.push(`${type}:${r.id}`);
    }
    if (page >= (list.total_pages ?? 1)) break;
  }
  return ids;
}

/** Candidate ids for a section, in order. main() filters them and trims to the limit. */
async function resolveSection(s: SectionConfig, ctx: ResolveContext): Promise<string[]> {
  const src = s.source;
  if ('ids' in src) return src.ids;
  if ('sparkfree' in src) return films.map((f) => `sparkfree:${f.slug}`);
  if ('apps' in src) return src.apps.map((id) => (typeof id === 'number' ? `provider:${id}` : `app:${id}`));
  const limit = s.limit ?? 20;
  const want = s.requireProvider ? limit * OVERFETCH : limit;
  if ('recommendations' in src) {
    const fromSection = src.recommendations.section
      ? ctx.sections[src.recommendations.section]?.find((id) => /^(movie|tv):/.test(id))
      : undefined;
    const seed = fromSection ?? src.recommendations.id;
    ctx.seeds[s.id] = seed;
    const [type, num] = seed.split(':');
    return listIds(`${type}/${num}/recommendations`, {}, want);
  }
  const paths = Array.isArray(src.tmdb) ? src.tmdb : [src.tmdb];
  const lists = await Promise.all(
    paths.map((path) =>
      listIds(
        path,
        expandParams(src.params, mediaOf(path), { appProviders: ctx.appProviders, sinceDays: src.sinceDays }),
        want,
      ),
    ),
  );
  return interleave(lists);
}

async function fetchSparkFree(id: string): Promise<Title | null> {
  const film = films.find((f) => `sparkfree:${f.slug}` === id);
  if (!film) return null;
  const en = await tmdb<TmdbDetail>(`movie/${film.tmdb}`, {
    language: 'en-US',
    append_to_response: 'images,release_dates',
    include_image_language: 'en,null',
  });
  const es = await tmdb<TmdbDetail>(`movie/${film.tmdb}`, { language: 'es-ES' });
  return normalizeSparkFree(film, en, es, mediaKeys(film.slug), ASSET_BASE_URL);
}

async function fetchTitle(id: string): Promise<Title | null> {
  if (id.startsWith('sparkfree:')) return fetchSparkFree(id);
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

  // Provider ids in the Apps row(s), plus the ad tiers that fold into them (for "@apps").
  const appIds = allSections.flatMap((s) =>
    'apps' in s.source ? s.source.apps.filter((id): id is number => typeof id === 'number') : [],
  );
  const appProviders = [
    ...appIds,
    ...Object.entries(PROVIDER_ALIASES)
      .filter(([, main]) => appIds.includes(main))
      .map(([alias]) => Number(alias)),
  ];
  const seeds: Record<string, string> = {};

  console.log(`Resolving ${allSections.length} sections…`);
  for (const s of allSections) sections[s.id] = await resolveSection(s, { appProviders, sections, seeds });

  const titleIds = [
    ...new Set(
      Object.values(sections)
        .flat()
        .filter((id) => !id.startsWith('provider:') && !id.startsWith('app:'))
        .concat(Object.values(seeds)),
    ),
  ];
  console.log(`Fetching ${titleIds.length} titles (en-US + es-ES)…`);
  const fetched = await pool(titleIds, 4, fetchTitle);
  // "Watch on" buttons: only the services in the Apps row(s), with ad tiers folded in.
  const appProviderSet = new Set(appIds);
  const titles: Catalog['titles'] = {};
  for (const t of fetched) {
    if (!t) continue;
    t.providers = [...new Set(t.providers.map((id) => PROVIDER_ALIASES[id] ?? id))].filter((id) =>
      appProviderSet.has(id),
    );
    titles[t.id] = t;
  }

  // Drop titles we couldn't fetch, and titles with no usable artwork. Spark Free titles only
  // need a backdrop: a missing textless poster falls back to the title set in type. Rows marked
  // requireProvider also drop titles not streaming on an Apps-row service. Then trim to the limit.
  const configs = new Map(allSections.map((s) => [s.id, s]));
  for (const [sid, ids] of Object.entries(sections)) {
    const config = configs.get(sid);
    const kept = ids.filter((id) => {
      if (id.startsWith('provider:') || id.startsWith('app:')) return true;
      const t = titles[id];
      if (!t?.images.backdrop || !(t.images.poster || t.source === 'sparkfree')) return false;
      return !config?.requireProvider || t.providers.length > 0;
    });
    sections[sid] = config?.limit ? kept.slice(0, config.limit) : kept;
    if (config?.limit && kept.length < config.limit)
      console.warn(`  ${sid}: only ${kept.length} of ${config.limit}`);
  }

  // Keep only titles that something shows: a section item or a recommendations seed.
  const used = new Set([...Object.values(sections).flat(), ...Object.values(seeds)]);
  for (const id of Object.keys(titles)) if (!used.has(id)) delete titles[id];

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
    ...(Object.keys(seeds).length ? { seeds } : {}),
  };
  writeFileSync(join(root, 'data/catalog.json'), JSON.stringify(catalog, null, 1) + '\n');
  console.log(
    `Wrote data/catalog.json: ${Object.keys(titles).length} titles, ${Object.keys(providers).length} providers.`,
  );
  for (const [sid, ids] of Object.entries(sections)) console.log(`  ${sid}: ${ids.length}`);
}

await main();
