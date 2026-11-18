/**
 * npm run media:encode [-- --only <slug>] [-- --force]
 * Cuts each film's backdrop still (16:9, 1280×720 JPEG) and trailer (16:9 fill, 1080p), and encodes the
 * full film (1080p, original aspect) with ffmpeg.
 * Outputs to <SPARKFREE_SOURCE_DIR>/encoded/sparkfree/<slug>/. Skips files that already exist.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { films, mediaKeys, outDir, sourceDir } from './sparkfree.ts';

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined;
const force = args.includes('--force');

// H.264 High, yuv420p, 2 s keyframes (24 fps sources; fine for 30), AAC stereo, moov up front for streaming.
const VIDEO = [
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-profile:v',
  'high',
  '-pix_fmt',
  'yuv420p',
  '-g',
  '48',
];
const AUDIO = ['-c:a', 'aac', '-b:a', '160k', '-ac', '2'];
const MP4 = ['-movflags', '+faststart'];

function ffmpeg(out: string, argv: string[]): void {
  if (existsSync(out) && !force) return console.log(`  exists, skipped: ${out}`);
  mkdirSync(dirname(out), { recursive: true });
  const tmp = out.replace(/\.(\w+)$/, '.part.$1');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-stats', '-y', ...argv, tmp], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${out}`);
  renameSync(tmp, out);
}

for (const f of films.filter((f) => !only || f.slug === only)) {
  const src = join(sourceDir, f.file);
  if (!existsSync(src)) {
    console.warn(`${f.slug}: source missing (${src}), skipped`);
    continue;
  }
  const keys = mediaKeys(f.slug);
  const { start, duration } = f.trailer;
  console.log(`${f.slug}: backdrop at ${f.still}s`);
  ffmpeg(join(outDir, keys.backdrop), [
    ...['-ss', String(f.still), '-i', src, '-frames:v', '1'],
    '-vf',
    'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720',
    ...['-q:v', '3'],
  ]);
  console.log(`${f.slug}: trailer ${start}s +${duration}s`);
  ffmpeg(join(outDir, keys.trailer), [
    ...['-ss', String(start), '-t', String(duration), '-i', src, '-map', '0:v:0', '-map', '0:a:0'],
    // Fill the 16:9 billboard (wide films crop at the sides), with short fades so it loops cleanly.
    '-vf',
    `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fade=in:d=0.5,fade=out:st=${duration - 0.8}:d=0.8`,
    '-af',
    `afade=in:d=0.5,afade=out:st=${duration - 0.8}:d=0.8`,
    ...VIDEO,
    '-crf',
    '22',
    ...AUDIO,
    ...MP4,
  ]);
  console.log(`${f.slug}: full film`);
  ffmpeg(join(outDir, keys.full), [
    ...['-i', src, '-map', '0:v:0', '-map', '0:a:0'],
    // Original aspect (the player letterboxes); never upscale. The soundtrack is re-encoded, never edited.
    '-vf',
    "scale='min(1920,iw)':-2",
    ...VIDEO,
    '-crf',
    '21',
    ...AUDIO,
    ...MP4,
  ]);
}
console.log('Done.');
