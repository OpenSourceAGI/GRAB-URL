# CLAUDE.md — `archiver-web`

**Published on its own**, built by this package's own `vite.config.ts` into
three entries: `archiver-web`, `bin-extract`, `bin-compress`. Since 3.0 they no
longer ride inside the `grab-url` package — a library consumer should not be
installing two executables.

A universal archive extractor and creator on **JSZip** — frontend-capable, so it
runs in a browser as well as in Node.

## Safety is the main design constraint

- **Zip slip.** An archive entry named `../../etc/thing` must never be written
  outside the destination directory. Normalize and verify every entry path
  against the resolved destination before writing — not after.
- **Zip bombs.** A small archive can expand to gigabytes. Respect and keep any
  size/entry-count limits; don't remove one to make a large legitimate file
  work.
- Symlink entries and absolute paths in archives are both traversal vectors.
- These rules apply doubly because two of the three entries are **executable
  bins** (`bin-extract`, `bin-compress`) that users point at untrusted files.

## Build notes

- `jszip` is **externalized** — resolved at runtime from a global, a local
  install, or the CDN, never bundled and never a declared dependency.
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
