# Setup

The project's decision log: how it's set up, why, and what's next. Read it before setup, infra or planning work, and update it in the same commit as the work. Never put secret values here; name secrets only.

The product and architecture reference (module contract, data schemas, Home layout, module catalog, moderator panel, key map) is in [SPEC.md](SPEC.md).

**What it is:** a browser-based TV home screen prototype (in the style of webOS or Google TV) on a fixed 1920×1080 canvas, driven only by arrows, OK and Back, so it runs on a real TV with a FLIRC remote. It's a portfolio piece, a user-research prototype with a hidden moderator panel, and source material for a blog post.

## Decisions

Newest first. One line each: what was chosen, and why.

### Spark Free media (2026-11-18)

- 2026-11-18: Video is hosted in the R2 bucket `spark-tv-media`, served from its public r2.dev URL `https://pub-010076d3a9de4c5c985e85d1a1dd26fa.r2.dev` (public by design). The legacy bucket `spark-tv-assets` is left untouched and unused, because R2 buckets can't be renamed and nothing comes from the legacy app. Why r2.dev: free and enough for a prototype; it's rate-limited, so switch to a custom domain if testing ever hits the limit.
- 2026-11-18: The Spark Free lineup is Big Buck Bunny (TMDB 10378), Sintel (45745), Tears of Steel (133701), Spring (593048), Wing It! (1177628) and Sprite Fright (891761), with Coffee Run (717986) as the alternate. All are CC BY. Excluded: Cosmos Laundromat (rated 13+ by the studio, suicide themes), Agent 327 (CC BY-ND, no public file) and Charge (fight and stab scenes). Facts were checked against Blender's licence pages.
- 2026-11-18: Derek is buying one month of Blender Studio (about €11.50), because the original files for Spring, Wing It! and Sprite Fright are subscriber-only. CC BY lets us host them once downloaded. BBB, Sintel and ToS are free downloads from download.blender.org.
- 2026-11-18: Attribution rules. Show each film's credits scroll when the full film plays. Clips and trailers carry the film's credit line (e.g. "(CC) Blender Foundation | studio.blender.org"; per-film lines go in `data/sparkfree.json`). Tears of Steel's soundtrack is CC BY-ND ("(C) Joram Letwory"), so its audio is never edited, only cut along with the picture.

### Milestone 2 shell choices (2026-11-18)

- 2026-11-18: Start → launch → Home flow. "Skip launch screen" also skips the start screen at boot; Reset session always returns to the start screen, and OK then plays the launch unless skip is on. Why: the start screen exists to unlock audio and to reset between participants; with skip on, a facilitator wants Home immediately.
- 2026-11-18: The launch timeline is the SPEC's 2700 ms timeline scaled to "Launch duration" (1.8 / 2.7 / 4.0 s), built with the Web Animations API (transform/opacity only). The snap sound is a slot in `src/config.ts` (`SNAP_SOUND.src` null = silence), timed so its peak lands at 300 ms (scaled).
- 2026-11-18: Moderator state persists to localStorage and mirrors to URL params (`lang`, `v.<slot>`, `o.<type.option>`, `sound`, `skip`, `dur`, `preset`). Any moderator param in the URL replaces stored state, so a bookmarked condition always reproduces exactly. Any manual change clears the active preset.
- 2026-11-18: Moderator panel strings are English-only (they fall back to `en`). Why: the panel is for the facilitator, outside the fiction; participant-facing strings are translated.
- 2026-11-18: Moderator changes rebuild Home in place, keeping the focused row and each row's focus memory. The panel opens on M ×3 within 1.5 s (`MODERATOR_SEQUENCE` in `src/config.ts`, so a FLIRC-mapped remote key can replace M) or `?moderator=1`; Back or the sequence again closes it.
- 2026-11-18: The Credits screen uses TMDB's official "blue short" logo (`public/attribution/tmdb-short.svg`, from themoviedb.org/about/logos-attribution), shown smaller than the Spark lockup.
- 2026-11-18: Home scroll is clamped so the last section rests at the bottom safe area instead of scrolling to the top anchor and leaving empty space.

### Milestone 1 build choices (2026-11-18)

- 2026-11-18: Focus ring fixes. The focused card gets `z-index: 1`, so its scaled frame and ring draw over the next card. The ring's radius is the frame's radius plus the ring offset (`--frame-radius`, default `--radius-md`), so it stays concentric and leaves no gap at the corners.

- 2026-11-18: Apps row services (TMDB US provider IDs): Netflix 8, Prime Video 9, Disney+ 337, HBO Max 1899, Hulu 15, Apple TV 350, Peacock 386, Paramount+ 2303 (TMDB's old ID 531 is gone). A title's "Watch on" buttons only list these services, with ad tiers folded in (1796→8, 2100→9, 2616→2303). Why: TMDB lists many add-on channel variants per title, which would clutter the Display Page.
- 2026-11-18: TMDB key: reusing Derek's existing TMDB API application, renamed to Spark TV. The key was regenerated on 2026-11-18, because the old v3 key was hard-coded in the public `CodePath-Flicks-App` repo (2017). The new token was verified against `/3/authentication`. `TMDB_READ_TOKEN` lives only in `.env.local` on Guardian.
- 2026-11-18: Modules self-register, and `src/modules/index.ts` loads them all with `import.meta.glob`. Why: adding a module or variant is just a new file, with no edits to the core or an index (decision 10).
- 2026-11-18: Cards use a lighter, display-only contract (`el`, `width`, `load()`, `activate()`, `destroy()`). The row owns focus and the fixed cursor. Cards still register by type in the `cards` registry. Why: cards never route keys, so the full module contract would only add ceremony.
- 2026-11-18: Virtualization keeps live every section that intersects the viewport ± `layout.window-buffer`, plus the focused section ±1. Why: with real row heights, focused ±1 alone leaves blank rows on screen below the anchor. This keeps the intent: sections far off screen are destroyed.
- 2026-11-18: Heights are measured once when a page is built: everything is mounted, read in one batch with `offsetHeight`, cached, and then off-screen sections are unmounted. Images load only on demand, so the first mount stays cheap.
- 2026-11-18: In M1, hero B's slides come from TMDB `trending/all/week`, because Spark Free has no catalog yet. In M2 the hero source switches to Spark Free in `data/layout.json` (config only).
- 2026-11-18: Images are hotlinked from TMDB's image CDN (`image.tmdb.org`); `catalog.json` stores the URLs. Why: TMDB permits it, and it keeps the repo small. Spark Free media will live on R2.
- 2026-11-18: In M1 the locale is fixed per load (`?lang=es` for Spanish). The moderator panel switches it live in M2.

### Brand (2026-11-18)

- 2026-11-18: The Glint design system is `design/tokens.json` plus `src/brand/`, enforced by a Vitest check (`src/core/tokens-usage.test.ts`) that fails on hard-coded colours, font families, easings and durations in `src/`. No Figma library for now. Why: one source of truth in code costs nothing to keep in sync, and a full Figma library is a second system to maintain for a prototype. Revisit pushing tokens to Figma variables when Derek starts the Display Page designs.
- 2026-11-18: Brand is direction A, "Glint", from the planning chat. It replaces the placeholder brand in decisions 14 and 15: an anamorphic lens-flare mark, an Unbounded Light wordmark, warm char neutrals, and the spark spectrum used only for the mark, focus and progress. Specs are in SPEC.md under "Brand". Why: a premium, cinematic look that reads as both spark and cinema. Tokens, mark, wordmark and favicons ship now. The Spark Free tile and focus treatment come with the M1 cards; the launch sequence comes with Milestone 2.
- 2026-11-18: Dependency `@fontsource/unbounded` (OFL-1.1). Why: it self-hosts Unbounded Light in the bundle, so the prototype works offline on a TV with no Google Fonts request. Only the latin 300 subset is imported (it covers Spanish).
- 2026-11-18: Mark gradient stops use `style="stop-color: var(--…)"`, not the `stop-color` attribute. Why: SVG presentation attributes don't resolve CSS variables, and this keeps the mark colors in tokens.
- 2026-11-18: Static brand files and PNG favicons are generated by `npm run brand:assets` (macOS `sips` rasterizes the PNGs) from the same geometry as the runtime component. Why: one source for the mark; the favicon PNGs are committed, so Vercel needs no rasterizer.

### Setup choices (2026-11-18)

- 2026-11-18: No always-on launcher in `~/agents` or Login Items. Why: Derek's call; it's a prototype worked on in ad-hoc sessions.
- 2026-11-18: `main` is protected: PR required (0 approvals), enforced for admins, no force-push or deletion, required check `check` (CI). Merged branches auto-delete. Why: `main` is production, and enforcing for admins makes the rules apply to Claude pushing as Derek.
- 2026-11-18: Bootstrap gotcha: the push-guard hook fails closed, so in a session that loaded it, checking out a branch without `.claude/hooks/guard-push.py` (e.g. `main` before this PR merges) blocks every Bash call, including `!` commands. Once this PR is on `main`, every branch has the hook.
- 2026-11-18: Vercel Authentication protects previews only (`ssoProtection: preview`); production `spark-tv.vercel.app` is public. Why: it's a public portfolio piece, and previews stay behind a Vercel login. Set with the Vercel CLI (the MCP connector returned 403 for project updates).
- 2026-11-18: Vercel project `spark-tv` (Derek's Projects, `prj_vtfTnqGQAK9fLJQYztazrzHmw6fU`), framework Vite, connected to `derekpcollins/spark-tv`, holds `spark-tv.vercel.app`. Created with the Vercel CLI because the MCP connector returned 403 for project creation. Why: one project per repo, and the legacy project had released the domain.
- 2026-11-18: `engines.node` is pinned to `24.x`. Why: Vercel defaults to Node 26; this makes builds match local and CI.
- 2026-11-18: The repo stays public, with the code under the MIT license. The README says the license excludes TMDB data, provider logos/trademarks and Blender films. Why: it's a portfolio and blog piece meant to be read and reused, and that third-party material isn't Derek's to license.
- 2026-11-18: Guardrails: `.claude/settings.json` denies pushes to `main`, CLI production deploys (`vercel --prod`, `vercel promote`) and reading `.env.local`. The push-guard hook (`.claude/hooks/guard-push.py`, 149/149 tests passing) blocks any `git push` that would update `main`. Why: `main` is production, and the repo is public.
- 2026-11-18: Movies, Shows and Spark Free nav items take focus but don't switch pages until Milestone 3; only Home is built in M1–M2. Why: the milestones already put the remaining pages in M3, and this keeps M1 focused. Whether they ship in v1 is still open.
- 2026-11-18: GitHub Actions job `check` runs typecheck, lint, test and build on every PR, and it's the required check on `main`. Why: the same gate as the pre-commit checks, enforced on GitHub.
- 2026-11-18: Design tokens live in `design/tokens.json` and are applied at runtime as CSS custom properties (`--color-text-default`, etc.). Why: no build step, and the brand swap stays a one-file change (decision 14).
- 2026-11-18: Tooling is Vitest + jsdom for tests, ESLint (flat config + typescript-eslint) for lint, and Prettier for format checks. Why: standard for Vite + TS, and every tool works without secrets.
- 2026-11-18: The sync and pipeline scripts are TypeScript run directly by Node 24 (built-in type stripping), with no tsx. Why: tsx pulls in an esbuild install script, so this is one less dependency. Pinned in `.node-version` to Node 24, matching fnm on Guardian.
- 2026-11-18: TypeScript 6.0, not 7. Why: typescript-eslint (8.73) supports TypeScript below 6.1 only; TS 7's native compiler breaks type-aware linting. Revisit when typescript-eslint supports 7.
- 2026-11-18: Known dev-only `npm audit` finding: a picomatch ReDoS reached through typescript-eslint and vitest, with no non-breaking fix. Why it's accepted: build-time tooling only, never shipped to the browser. Re-check on dependency bumps.

### Product decisions (from the planning chat)

1. **Clean rebuild in a new repo.** Why: the earlier version was built for use at Netflix. Rebuild from the spec only and import no code, assets or history from `spark-tv-legacy`, so the new project carries no Netflix material.
2. **Netflix rule.** Netflix titles and the Netflix logo coming from TMDB/JustWatch data are fine and are handled exactly like every other provider. No Netflix-specific screens, card treatments or flows, and nothing that isn't public Netflix behavior.
3. **Stack: Vite + TypeScript, no UI framework, direct DOM.** Why: navigation and motion need fine-grained DOM control, and types make the module contracts enforceable. Node comes from the host's fnm setup.
4. **Canvas: fixed 1920×1080 px**, with the root scaled to fit the window by a single CSS transform (letterboxed if the aspect ratio differs). No vw/vh in components. Measure with `offsetWidth`/`offsetHeight`, not `getBoundingClientRect`. Why: the transform scale distorts `getBoundingClientRect`.
5. **Data: TMDB as a build-time snapshot.** `npm run sync` reads the token from `.env.local` and resolves the curated layout into `data/catalog.json`, which is committed. Why: the browser never sees the key and Vercel needs no env vars. The snapshot has `en-US` and `es-ES` metadata and uses region US for watch providers. Images are requested with `include_image_language=en,null` so title logos and textless backdrops come back.
6. **Real streaming services appear as app tiles,** using provider logos from TMDB watch-provider data (powered by JustWatch). Tiles take focus but don't launch anything.
7. **Video: no YouTube.** All video comes from Blender Studio open movies (CC BY, © Blender Foundation), hosted in a new Cloudflare R2 bucket. Blender's film logos are excluded from the CC license, so those titles are always set in type, never shown with their logos.
8. **"Spark Free" is Spark's built-in free channel** (like LG Channels or Samsung TV Plus). Its catalog is the Blender open movies. It gets the first tile in the Apps row and its own Home row.
9. **Selection model: every title opens a Display Page.** Spark Free titles get video: a full-bleed billboard trailer (overlays allowed), a background video on the Display Page, and a Play button that plays the full film in a simple player. All other titles are static (backdrop image), with "Watch on <provider>" buttons that take focus but don't launch. Why: it matches how aggregator home screens behave and makes Spark Free the place where video lives.
10. **Modularity via registries.** Every hero, section, card, Display Page template and overlay is a module registered by type that declares its variants and options. Pages are ordered lists of sections in layout config. Adding a variant means one new file plus one registration, with no edits to navigation or the app core.
11. **The moderator panel is generated from the registries.** v1 includes scenario presets. Interaction logging (CSV export) and control from a second device are v2. There is no in-world Settings screen for participants in v1.
12. **Input mapping layer from day one.** Every key goes through one keymap, so remote/FLIRC codes can be added without touching navigation. Back accepts both Escape and Backspace.
13. **Attribution.** A Credits screen reachable from Home carries the TMDB logo and notice, JustWatch attribution, a CC BY credit for each Blender film, and a trademark disclaimer (exact wording in SPEC.md).
14. **Branding.** The name stays Spark TV. A full rebrand (mark, wordmark, launch animation, color system) is being designed in chat. Until it lands, the app uses a plain text wordmark and a neutral token set. Every brand value is a design token, so the swap is one change.
15. **Launch sequence.** A "Press OK to start" screen, then the launch animation: a finger-snap sound, the spark mark bursting in on the snap, and the "Spark TV" wordmark sliding out from behind the mark (masked), all in about 2.5 s. Why the start screen: browsers block audio until the user interacts, the OK press unlocks it, and it doubles as the reset point between research participants. Built as a module with a placeholder mark and a sound slot. The real mark, timing and recorded snap arrive with the brand.
16. **Deployment: Vercel,** with previews on every branch; `main` is production. The legacy project (now `spark-tv-legacy`) has released `spark-tv.vercel.app` (confirmed 2026-11-18: it holds only `spark-tv-legacy.vercel.app`), so the new project takes that name.
17. **Performance: hold 60fps.** Animate transform and opacity only, virtualize rows, lazy-load images ahead of focus, keep video inert until visible, and release it fully on exit.

## Current state

- Repo: `derekpcollins/spark-tv` (public, MIT), default branch `main` (first commit pushed 2026-11-18). Protected (PR required, 0 approvals, enforced for admins, no force-push/deletion, required check `check`); merged branches auto-delete.
- Hosting: Vercel project `spark-tv`, Git-connected, previews on every branch (no `vercel.json` limits), production at `spark-tv.vercel.app`. Vercel Authentication on previews only; production is public.
- Secrets needed (names only): `TMDB_READ_TOKEN` (TMDB API Read Access Token, local `.env.local` only, used by `npm run sync`). Next: R2 upload credentials for the video pipeline (an R2 API token scoped to `spark-tv-media`; names go in `.env.example` when the upload script lands). Vercel needs none.
- Build and tests: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (all four: `npm run check`).
- App: Milestone 1 on PR `feat/m1-core`: canvas, keymap, focus engine + overlay stack, registries, i18n, page view (vertical motion, dim, virtualization), header, hero B, Apps row, Trending (landscape) and Popular on Prime Video (poster), generic Display Page. 37 tests. Catalog snapshot 2026-11-18: 40 titles, 8 providers.

## Open items

- Re-run `npm run sync` before demos: trending rows go stale. `catalog.json` is a snapshot by design.
- Exact remote button for the moderator sequence (decide during FLIRC setup).
- Which Blender films make the cut, and which have usable 1080p sources.
- Whether the Movies, Shows and Spark Free pages ship in v1 or only Home.
- Display Page designs (Derek's, coming).
- Recorded snap sound (Derek). Brand and launch timing are settled (Glint).

## Next steps

1. Derek reviews and merges the Milestone 1 PR (setup checklist complete: PRs #1 and #2 merged, `main` protected, Vercel previews on).
2. ~~Milestone 1~~ (in review): canvas scaling, keymap, focus engine and overlay stack, registries. A TMDB sync script producing `catalog.json`. Home renders the header, hero B (static), the Apps row and two content rows from real data, with full LRUD, vertical row motion and focus memory. The generic Display Page opens and Back restores focus. Vitest coverage for the focus engine and registries. A Vercel preview deployed.
3. **Milestone 2** (shell on PR `feat/m2-shell`: start screen, launch, moderator panel with presets, live es, Credits; Spark Free next, waiting on R2 setup and the film shortlist): Spark Free (sources, clips, R2, hero A video, player), start screen and launch sequence (placeholder brand), moderator panel with presets, `es` locale, Credits screen.
4. **Milestone 3:** remaining card types and pages, polish and performance pass, README with the FLIRC key map, brand swap.
