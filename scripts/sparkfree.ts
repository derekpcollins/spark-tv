/** Shared Spark Free config for the media scripts and the sync. */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface Film {
  slug: string;
  tmdb: number;
  file: string;
  rating?: string;
  year?: number;
  license: string;
  credit: string;
  extraCredit?: string;
  trailer: { start: number; duration: number };
  /** Seconds into the film for the backdrop still. */
  still: number;
}

export const root = join(import.meta.dirname, '..');
export const films = (
  JSON.parse(readFileSync(join(root, 'data/sparkfree.json'), 'utf8')) as { films: Film[] }
).films;

/** Downloaded masters (outside the repo: several GB). */
export const sourceDir = process.env.SPARKFREE_SOURCE_DIR ?? join(homedir(), 'Downloads/spark-tv-films');
/** Encoded output, mirroring the R2 key layout. */
export const outDir = join(sourceDir, 'encoded');

/** R2 keys, relative to ASSET_BASE_URL. */
export const mediaKeys = (slug: string) => ({
  trailer: `sparkfree/${slug}/trailer.mp4`,
  full: `sparkfree/${slug}/film.mp4`,
  backdrop: `sparkfree/${slug}/backdrop.jpg`,
});
