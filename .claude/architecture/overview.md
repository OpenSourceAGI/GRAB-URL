# Architecture Overview

`grab-url` — the library — built from several source folders under `packages/`,
plus the programs that ship beside it, a documentation site and an agent skill.
`packages/grab-url/vite.config.ts` compiles the library entries into that
package's `dist/`, and its `exports` map is the public surface. The CLI and
`archiver-web` build from their own configs into their own packages, so nothing
you run from a terminal is inside what you import in a browser.

## The packages

| Folder | Published as | What it is |
| --- | --- | --- |
| `grab-api` | the `grab-url` main entry (slim) and `grab-url/full`, **and `grab-api.js` on its own** | The `grab()` function. Zero runtime dependencies — that is the product claim. `grab-api.js` is the same source published without the loading icons; a consumer installs it *or* `grab-url`, never both. |
| `grab-url-cli` | `grab-url-cli`, with the `grab-url` / `grab` / `g` bins | The download CLI: HTTP, SFTP, torrents/magnets (aria2c), 700+ media sites (yt-dlp), page archiving. **Its own package since 3.0** — importing the library must not install chalk and a yt-dlp binary. |
| `archiver-web` | `archiver-web`, `grab-url/…` bins | ZIP extract/create on JSZip. Frontend-only, no WASM. Powers auto-unzip. |
| `api2client` | `api2client` | Generates a typed client from an OpenAPI spec with Hey API, wired to send through `grab` instead of axios. |
| `log-json` | `grab-url/log` | `log()` — the colored JSON structure printer and request history. |
| `loading-animations` | `grab-url/animations` | Tree-shakable SVG spinners plus CLI terminal spinner frames. |
| `quantum-sphere-loading-animation` | `grab-url/icons/quantum-sphere` | The 3D orbital loader, React and Svelte. |
| `native-app-wrapper` | `native-app-wrapper` | Tauri scaffold packaging a site or a bundled CLI as a desktop/mobile app, driven by one JSON profile. Ships grab-url's downloader with yt-dlp as a sidecar. **Excluded from the workspace globs** (`"!packages/native-app-wrapper"`) — it installs and builds on its own. |

## Inside `grab-api`

```
src/index.slim.ts         the grab() entry and the instance factory — the DEFAULT
src/index.ts              the same plus the heavy processors (`grab-url/full`)
src/core/
  core.ts                 the request lifecycle
  request-prep.ts         params, headers, baseURL, body encoding
  request-executor.ts     the fetch call (…-slim.ts is the trimmed variant)
  flow-control.ts         dedupe, cancel, rate limit, timeout, retry
  cache-pagination.ts     the frontend cache and infinite-scroll paging
  regrab-events.ts        refetch on refocus / network change / stale
  content-processors.ts   auto-JSON, auto-unzip, DOM parsing
src/response/
  response-handler.ts     shaping { data, error, isLoading } onto the response object
  infinite-scroll.ts      merging the next page, scroll position recovery
src/devtools/devtools.ts  the Ctrl+Alt+I overlay
src/common/{types,utils}.ts
```

A request runs: `request-prep` → `flow-control` (may short-circuit on dedupe,
rate limit or cache) → `request-executor` → `content-processors` →
`response-handler`. The response object is pre-initialized and mutated, which is
why `.isLoading` can be bound by any framework without a hook.

**Slim is the default; full is opt-in.** `import grab from "grab-url"` resolves
to `index.slim.ts` — ~16 kB, ~7 kB gzipped, no DOM parser and no unzipper.
`grab-url/full` resolves to `index.ts`, which reaches `content-processors.ts`
and through it linkedom and archiver-web. (`grab-url/slim` is kept as an alias
of the default, so 2.x code and `api2client` keep resolving — and to the *same*
module, so there is one `grab.mock`.)

The split is a matter of which files the graph reaches, not of an externals
rule: the slim entry uses `request-executor-slim.ts`, which never imports
`content-processors.ts`. Anything added to `index.slim.ts` or to the modules it
shares with `index.ts` is paid for by every consumer of the default import.
`test/packaging.test.ts` walks the built bundles and fails if the DOM parser or
the unzipper becomes reachable from it.

## Inside `grab-url-cli`

```
src/index.ts              arg parsing → dispatch
src/cli-args.ts           the flag surface
src/transfer/
  media-domains.ts        which URLs get routed to yt-dlp (700+ domains)
  ytdlp-transfer.ts       yt-dlp, ytdlp-binary.ts installs/locates it
  aria2-transfer.ts       torrents and magnet links
  single-file-transfer.ts / multi-file-transfer.ts
  resume-state.ts         resumable transfers
src/page/                 --page: archive an article into ./<Page Title>/
src/background.ts         detach and keep going
src/keyboard-controls.ts  Ctrl+C offering resume/background rather than dying
src/display/, download-spinners.ts, cancel-state.ts
```

`--page` loads **`extract-webpage`** (the qwksearch extractor) through a runtime
`import()`. It is an optional peer dependency and must never enter the bundle —
it drags in jsdom/linkedom. `extract-webpage-loader.ts` exists to keep that
boundary; do not turn it into a static import.

yt-dlp is installed by `packages/grab-url-cli/scripts/install-yt-dlp.mjs`, which
runs on `postinstall` — of `grab-url-cli`, not of the library.
