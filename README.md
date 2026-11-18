# Spark TV

A browser-based prototype of a TV platform home screen: content-forward rows that blend titles from many streaming services, plus app tiles for those services. It runs on a fixed 1920×1080 canvas and is driven entirely by arrows, OK and Back, so it works with a real TV remote through a FLIRC USB receiver.

Built with Vite and TypeScript, with no UI framework.

## Run it

Requires Node 24 (see `.node-version`).

```sh
npm install
npm run dev
```

## Commands

| Command                | What it does                                               |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Local dev server                                           |
| `npm run build`        | Production build into `dist/`                              |
| `npm run typecheck`    | TypeScript check                                           |
| `npm run lint`         | ESLint and Prettier check                                  |
| `npm test`             | Vitest                                                     |
| `npm run check`        | All of the above, in order                                 |
| `npm run brand:assets` | Regenerate the static mark SVGs and favicons               |
| `npm run sync`         | Refresh `data/catalog.json` from TMDB (needs `.env.local`) |

## Docs

- [docs/SETUP.md](docs/SETUP.md): decisions, current state, open items, next steps
- [docs/SPEC.md](docs/SPEC.md): architecture and product reference

## License

The source code is MIT licensed (see [LICENSE](LICENSE)). The license covers only the code written for this project. It does not cover third-party material, which stays under its owners' terms:

- Title metadata and images in `data/catalog.json` come from TMDB and are subject to the [TMDB API terms](https://www.themoviedb.org/api-terms-of-use).
- Streaming service names and logos are trademarks of their owners.
- Blender Studio open movies are CC BY (© Blender Foundation | studio.blender.org); their film logos are not covered by that license.

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming provider data is powered by JustWatch. The Unbounded typeface is licensed under the SIL Open Font License. Logos and trademarks belong to their owners; Spark TV is not affiliated with them.
