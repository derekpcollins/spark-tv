/**
 * npm run ads [-- --upload]: cut each ad's banner image from its master in assets-src/ads and
 * encode it as WebP at the banner's exact size (card.banner-width × card.banner-height from
 * design/tokens.json). Output goes to assets-src/ads/build/ (gitignored). With --upload it is
 * pushed to R2 (bucket spark-tv-media) under the key the ad module loads via ASSET_BASE_URL.
 * Needs ffmpeg and cwebp (Homebrew: ffmpeg, webp); --upload needs the R2_* names in .env.local.
 */
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { r2Client } from './r2.ts';

const root = join(import.meta.dirname, '..');
const BUCKET = 'spark-tv-media';
const CACHE = 'public, max-age=86400';

/** Crop boxes are in master pixels; each is cropped to the banner ratio, then scaled down. */
const ADS = [
  {
    // Full width, rows 390–600: the whole hiker (rows 404–521), the island and the top of the lake,
    // the sun at the top edge 34% across. The hiker sits at 81% across, clear of the Ad badge.
    master: 'assets-src/ads/northwake-master.png',
    crop: { x: 0, y: 390, width: 2172 },
    key: 'ads/northwake-banner.webp',
  },
];

const tokens = JSON.parse(readFileSync(join(root, 'design/tokens.json'), 'utf8')) as {
  card: Record<string, string>;
};
const width = parseInt(tokens.card['banner-width']!, 10);
const height = parseInt(tokens.card['banner-height']!, 10);
const buildDir = join(root, 'assets-src/ads/build');
mkdirSync(join(buildDir, 'ads'), { recursive: true });

for (const ad of ADS) {
  const cropHeight = Math.round((ad.crop.width * height) / width);
  const png = join(buildDir, 'tmp.png');
  const out = join(buildDir, ad.key);
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-i',
    join(root, ad.master),
    '-vf',
    `crop=${ad.crop.width}:${cropHeight}:${ad.crop.x}:${ad.crop.y},scale=${width}:${height}:flags=lanczos`,
    png,
  ]);
  execFileSync('cwebp', ['-quiet', '-q', '82', '-m', '6', png, '-o', out]);
  rmSync(png);
  console.log(`  ${ad.key}: ${width}×${height}, ${(statSync(out).size / 1024).toFixed(0)} KB`);
}

if (process.argv.includes('--upload')) {
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
  for (const ad of ADS) {
    const file = join(buildDir, ad.key);
    const size = statSync(file).size;
    const body = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>;
    await r2.put(ad.key, body, size, 'image/webp', CACHE);
    console.log(`  uploaded ${ad.key}`);
  }
}
