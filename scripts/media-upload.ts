/**
 * npm run media:upload [-- --only <slug>] [-- --force]
 * Uploads encoded Spark Free media to R2 (bucket spark-tv-media), skipping objects that already
 * exist with the same size. Reads R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY from .env.local.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { r2Client } from './r2.ts';
import { films, mediaKeys, outDir, root } from './sparkfree.ts';

const BUCKET = 'spark-tv-media';
// Files are re-encoded rarely, but names are stable, so don't cache forever.
const CACHE = 'public, max-age=86400';

if (existsSync(join(root, '.env.local'))) process.loadEnvFile(join(root, '.env.local'));
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set in .env.local.');
  process.exit(1);
}
const r2 = r2Client(
  { accountId: R2_ACCOUNT_ID, accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  BUCKET,
);

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined;
const force = args.includes('--force');

for (const f of films.filter((f) => !only || f.slug === only)) {
  for (const key of Object.values(mediaKeys(f.slug))) {
    const file = join(outDir, key);
    if (!existsSync(file)) {
      console.warn(`  missing, run media:encode first: ${key}`);
      continue;
    }
    const size = statSync(file).size;
    if (!force && (await r2.head(key)) === size) {
      console.log(`  up to date: ${key}`);
      continue;
    }
    const mb = (size / 1e6).toFixed(0);
    console.log(`  uploading ${key} (${mb} MB)…`);
    const body = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>;
    await r2.put(key, body, size, key.endsWith('.jpg') ? 'image/jpeg' : 'video/mp4', CACHE);
  }
}
console.log('Done.');
