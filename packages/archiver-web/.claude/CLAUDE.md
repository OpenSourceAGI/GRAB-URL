# CLAUDE.md — `archiver-web`

**Published on its own**, and built into three `grab-url` entries:
`archiver-web`, `bin-extract`, `bin-compress`.

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

- `jszip` is **externalized** — the caller provides it.
- `archiver-web` is externalized from the **slim** `grab-url` entry, so the slim
  build doesn't carry it. Keep the import surface externalizable.
- The `bin-*` chunks get the `#!/usr/bin/env node` banner from the root build,
  not from source.

## Layout

`src/index.ts` · `src/bin-extract.ts` · `src/bin-compress.ts` · `src/types.ts`

Tests: `test/archiver.test.ts`.
