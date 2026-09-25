# CLAUDE.md — `grab-url-cli`

**Published on its own** as `grab-url-cli`, with the `grab-url`, `grab` and `g`
bins, built by this package's own `vite.config.ts` into `dist/grab-url-cli.*`.

Until 3.0 it rode inside the `grab-url` package. It doesn't any more, and that
is the point: `grab-url` is a ~16 kB library you import in a browser, and it
must not make every consumer install chalk, cli-table3, cli-progress and a
yt-dlp binary. **Nothing here may end up in the `grab-url` bundle.** If the CLI
needs something from the library, import it from `packages/grab-api/src/` — the
dependency runs one way only.

## Things that bite

- **The shebang comes from the build, not the source.** This package's
  `vite.config.ts` adds `#!/usr/bin/env node` via
  `rollupOptions.output.banner`, matched on the chunk name. Rename the entry or
  remove the banner and the bins stop being executable.
- **This build wants the *full* grab.** Its alias maps `@grab-url/grab-api` to
  `index.ts`, not `index.slim.ts` — page archiving needs the DOM parser. That
  is the opposite of the library default, on purpose.
- **`extract-webpage` must stay a runtime `import()`.** It backs `--page`, it is
  an *optional* peer dependency, and it pulls in jsdom/linkedom. It is
  externalized on purpose — a static import would drag a DOM implementation into
  every CLI install. `inlineDynamicImports: false` exists to keep that dynamic.
- **yt-dlp is an external binary**, fetched by this package's
  `scripts/install-yt-dlp.mjs` at postinstall. Media-site URLs route through it. It may be missing, outdated, or
  blocked — fail with a message that says how to fix it (`npm run ytdlp`), not a
  stack trace.

## Safety — this writes to the user's filesystem from a URL they typed

- **Never write outside the target directory.** Path traversal from a
  server-supplied filename is the classic download-tool vulnerability; sanitize
  the name, don't trust `Content-Disposition`.
- Don't follow a redirect into a local/private address on a user-supplied URL.
- Don't overwrite an existing file without saying so.

## Layout

`src/index.ts` · `src/cli-args.ts` · `src/file-downloader.ts` ·
`src/download-spinners.ts` · `src/keyboard-controls.ts` · `src/cancel-state.ts`
· `src/background.ts` · `src/display/` · `src/page/` · `src/transfer/`

Cancellation is real state (`cancel-state.ts`, `keyboard-controls.ts`) — a
partially written file must be cleaned up or resumable, not left as a plausible
looking truncated download.

## Testing

Tests live in `packages/grab-url/test/` (`downloader.test.ts`,
`command.test.ts`, `ytdlp.test.ts`, `aria2.test.ts`, `page-archive.test.ts`) —
one Vitest project covers the whole repo.

```bash
cd packages/grab-url && npm run test
cd packages/grab-url-cli && npm run build && npm run test:cli   # a real
                          # end-to-end download — run by hand, not in CI
```
