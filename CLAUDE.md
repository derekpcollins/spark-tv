# Spark TV

A browser-based prototype of a TV platform home screen (in the style of webOS or Google TV) on a fixed 1920×1080 canvas, driven only by arrows, OK and Back, so it runs on a real TV with a FLIRC remote. It's a public portfolio piece, a user-research prototype with a hidden moderator panel, and source material for a blog post. Vite + TypeScript, no UI framework, direct DOM, on Vercel.

**Pushes to `main` deploy to production.**

- `docs/SETUP.md`: decision log (decisions and why, current state, open items, next steps). Read it before setup, infra or planning work, and update it in the same commit as the work.
- `docs/SPEC.md`: architecture and product reference (module contract, data schemas, Home layout, module catalog, moderator panel, key map, attribution). Read it before building a module.

## Stack

- Vite 8, TypeScript 6.0 (not 7: typescript-eslint doesn't support it yet), Node 24 (`.node-version`)
- Vitest + jsdom, ESLint (typescript-eslint), Prettier
- Data: TMDB snapshot built by `npm run sync` into `data/catalog.json` (committed). Video: Blender open movies (`data/sparkfree.json`) encoded by `npm run media:encode` and served from the R2 bucket `spark-tv-media` (`ASSET_BASE_URL` in `src/config.ts`).

## Structure

- `src/core/`: app core (canvas, tokens, keymap, focus engine, overlay stack, registries, store, i18n)
- `src/modules/`: one module per file (sections, cards, display pages, overlays), each registering itself
- `src/styles/`: global CSS (tokens only, no raw values)
- `design/tokens.json`: the Glint design system: every brand and visual value, applied as CSS custom properties (`--color-text-primary`)
- `src/brand/`: Glint mark (`createMark`), wordmark and lockups (`createWordmark`); `npm run brand:assets` regenerates the static SVGs and favicons
- `data/`: `layout.json` (hand-authored), `catalog.json` (generated), later `sparkfree.json`, `presets.json`
- `scripts/`: Node scripts (TypeScript, run directly by Node 24), e.g. `scripts/sync.ts`

## Commands

- `npm run dev`: local dev server
- `npm run typecheck`: `tsc --noEmit`
- `npm run lint`: ESLint and the Prettier check (`npm run format` fixes formatting)
- `npm test`: Vitest
- `npm run build`: production build
- `npm run check`: all four checks, in order
- `npm run sync`: refresh `data/catalog.json` from TMDB. Needs `TMDB_READ_TOKEN` in `.env.local`. It calls a third-party API, so run it only when the catalog or layout needs refreshing.
- `npm run media:encode [-- --only <slug>]`: cut each Spark Free film's backdrop still and trailer and encode the full film with ffmpeg (Homebrew, not an npm dependency). Reads the masters from `SPARKFREE_SOURCE_DIR` (default `~/Downloads/spark-tv-films`) and writes outside the repo to its `encoded/` folder. Skips existing files; delete one to re-cut it.
- `npm run ads [-- --upload]`: cut each ad banner image from its master in `assets-src/ads/` to the banner's exact size and encode WebP (needs Homebrew `webp` for `cwebp`). `--upload` writes to the public R2 bucket, so check the image first.
- `npm run media:upload [-- --only <slug>]`: upload encoded media to R2, skipping objects already there at the same size. Needs the `R2_*` names in `.env.local`. It writes to a public bucket, so run it only after an encode you've checked.

## Pre-commit checks

Before every commit, all of these must pass (`npm run check` runs them in order). CI runs the same steps as the required `check` job.

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`

## Rules

- Never commit or push to `main`. Always work on a branch and open a PR. Every PR gets a Vercel preview URL; review it before merging.
- Never deploy to production from the CLI (`vercel --prod`, `vercel promote`). Production comes only from merging to `main`.
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- One module per file. Every module registers its type, variants and options schema. Adding a variant means one new file plus one registration, with no edits to navigation or the core.
- Modules implement the contract in `docs/SPEC.md` (`create(config, ctx)` returning `el`, `focus`, `blur`, `handleKey`, `destroy`). The focus engine knows only the contract.
- Every key goes through the keymap (`src/core/keymap.ts`). Never read `KeyboardEvent.key` anywhere else.
- Pages measure section heights when they're built, so build only after `stylesReady()` (`src/core/boot.ts`): WebKit runs the module script before the stylesheet applies.
- Animate transform and opacity only. Batch layout reads before writes. Measure with `offsetWidth`/`offsetHeight`, never `getBoundingClientRect` (the canvas is scaled). No vw/vh in components.
- All visible strings go through the i18n function. All brand and visual values go through tokens; never hard-code colours, sizes, spacing, durations or fonts. `src/core/tokens-usage.test.ts` fails the build on hard-coded colours, fonts, easings and durations in `src/`; a line marked `tokens-ok` is a reviewed exception.
- Brand (Glint, see SPEC.md "Brand"): the spark spectrum is only for the mark, focus and progress. No red anywhere in the UI. The TV header shows the wordmark only.
- No Netflix-specific anything. Netflix titles and the Netflix logo from TMDB/JustWatch data are treated exactly like every other provider; no Netflix-specific screens, card treatments or flows. Import nothing from `spark-tv-legacy`.
- Blender film logos are not CC-licensed: set Spark Free titles in type, never with their logos.
- Video: `preload="none"`, set `src` only when visible, on exit pause + remove `src` + `load()`, never play under an overlay.
- No secret values in the repo. Secrets live only in `.env.local` (gitignored); `.env.example` lists the names. Never print, log or read `.env.local`.
- Never add a dependency without noting why in `docs/SETUP.md`.
- The repo is public: everything committed is visible.

## Gotchas

- None yet. Add each mistake an agent makes twice, as a one-line rule.
