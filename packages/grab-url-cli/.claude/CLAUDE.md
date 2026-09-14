# CLAUDE.md — `@grab-url/cli`

**Private — never published.** Built into `dist/grab-url-cli.*` and installed as
the `grab-url`, `grab` and `g` bins of the `grab-url` package.

## Things that bite

- **The shebang comes from the build, not the source.** `vite.config.ts` adds
  `#!/usr/bin/env node` via `rollupOptions.output.banner` for this chunk and the
  `bin-*` ones. Remove it and the bins stop being executable.
- **`extract-webpage` must stay a runtime `import()`.** It backs `--page`, it is
  an *optional* peer dependency, and it pulls in jsdom/linkedom. It is
  externalized on purpose — a static import would drag a DOM implementation into
  every CLI install. `inlineDynamicImports: false` exists to keep that dynamic.
- **yt-dlp is an external binary**, fetched by `scripts/install-yt-dlp.mjs` at
  postinstall. Media-site URLs route through it. It may be missing, outdated, or
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

Tests are in the root `test/` folder (`downloader.test.ts`, `command.test.ts`,
`ytdlp.test.ts`, `aria2.test.ts`, `page-archive.test.ts`).

```bash
npm run test
npm run test:cli     # a real end-to-end download — run by hand, not in CI
```
