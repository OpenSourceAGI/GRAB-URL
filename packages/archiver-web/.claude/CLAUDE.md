# CLAUDE.md — `archiver-web`

**Published on its own**, built by this package's own `vite.config.ts` into
three entries: `archiver-web`, `bin-extract`, `bin-compress`. Since 3.0 they no
longer ride inside the `grab-url` package — a library consumer should not be
installing two executables.

A universal archive extractor and creator — frontend-capable, so it runs in a
browser as well as in Node. ZIP/GZIP go through **JSZip**/**fflate** (pure JS,
no WASM). TAR, TAR.GZ, TAR.BZ2, TAR.XZ, standalone BZIP2/XZ, 7z and RAR go
through **libarchive.js**, a WebAssembly build of libarchive that is only
fetched — from a local install or the CDN — the first time one of those
formats is actually used. `detectArchiveKind()` (filename-based) and magic-byte
sniffing (no filename given) decide which backend `extract`/`compress` reach
for; see the dispatch in `src/index.ts`.

## Safety is the main design constraint

- **Zip slip.** An archive entry named `../../etc/thing` must never be written
  outside the destination directory. `safeRelativePath()` in `src/index.ts`
  normalizes and rejects any entry whose path escapes the extraction root
  (`..` segments, absolute paths) before it reaches a caller — apply it to
  every new extraction path, not just the ZIP one.
- **Zip bombs.** A small archive can expand to gigabytes. Respect and keep any
  size/entry-count limits; don't remove one to make a large legitimate file
  work.
- Symlink entries and absolute paths in archives are both traversal vectors.
  libarchive.js's own `getFilesObject()`/`extractFiles()` already drop
  non-regular-file entries (symlinks, devices) before they reach us, but
  that's their behavior to verify on upgrade, not a guarantee to lean on
  blindly.
- These rules apply doubly because two of the three entries are **executable
  bins** (`bin-extract`, `bin-compress`) that users point at untrusted files.

## Build notes

- `jszip`, `fflate`, and `libarchive.js` are all **externalized** — resolved
  at runtime from a global (JSZip/fflate only), a local install, or the CDN,
  never bundled even when present in `node_modules`. See the loaders in
  `src/index.ts` and the `external` check in `vite.config.ts`.
- `libarchive.js`'s `dist/libarchive.js` resolves its worker (and the worker
  resolves the `.wasm` binary) relative to its own `import.meta.url`. That's
  why loading it from a CDN URL works without any extra config: the worker
  and wasm come from that same CDN, automatically. Don't hardcode a
  `workerUrl` — the default relative resolution is what makes the CDN and
  local-install paths behave identically.
- Cross-origin `Worker` construction (the CDN path) depends on the browser
  honoring the CDN's CORS headers on the worker script; this is a real
  constraint of the approach, not a bug to "fix" by proxying the worker
  through this origin. Verified against a real Chromium: classic/module
  `Worker` construction is refused cross-origin regardless of CORS headers,
  so the CDN path for libarchive.js-backed formats only works today when the
  page is served from the same origin as the worker (e.g. self-hosted), or
  in Node (no origin restriction there).
- Don't call `Archive.init()` after importing libarchive.js. The Node build
  (`dist/libarchive-node.mjs`) self-initializes on import with a
  `worker_threads`-backed `getWorker`; `Archive.init()` unconditionally
  *replaces* `_options`, and calling it with no arguments silently breaks
  Node support. Verified: this cost about an hour to track down once.
- libarchive.js 2.0.2 has two real bugs, reproduced directly against the
  library (not this wrapper), that `src/index.ts` works around or surfaces
  clearly instead of silently mishandling:
  - Writing an uncompressed (`ArchiveCompression.NONE`) archive always fails
    ("written bytes don't match file size"), for any format and any input.
    A plain `.tar` is written as `.tar.gz` internally and gunzipped with
    fflate to recover the raw tar bytes.
  - Its reader can't decode a standalone BZIP2/XZ stream (outside a TAR),
    and it doesn't write a spec-compliant `.7z` container. `compress()`
    throws a clear error for `.7z` output rather than emitting a file
    nothing can open; `extract()` throws a clear error for standalone
    `.bz2`/`.xz` rather than silently returning zero files.
  - If you bump the libarchive.js version, re-verify all three before
    assuming they're fixed upstream.
- The **slim** `grab-url` entry never reaches this code at all: it uses
  `request-executor-slim.ts`, which does not import `content-processors.ts`.
  Only `grab-url/full` does, through a lazy `import("archiver-web")` that vite
  bundles into a chunk of the full build. Keep that import dynamic.
- The `bin-*` chunks get the `#!/usr/bin/env node` banner from this package's
  build, not from source.
- The bins are Node programs, so this config externalizes Node builtins;
  without that, vite swaps `util` for its browser stub and the build fails on
  `parseArgs`.

## Layout

`src/index.ts` · `src/bin-extract.ts` · `src/bin-compress.ts` · `src/types.ts`

Tests: `test/archiver.test.ts`.
