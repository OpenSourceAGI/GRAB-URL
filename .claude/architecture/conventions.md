# Conventions and General Rules

## Language and style

- TypeScript, ESM, targeting `es2022`. No framework in `grab-api` — it must work
  in a browser, in Node and in a Worker.
- **Zero runtime dependencies in `packages/grab-api/src/`.** Node builtins only.
  The root `package.json` does carry a few deps (chalk, cli-table3, cli-progress,
  linkedom) — those are for the CLI and the processors, and they are externalized
  from the library bundles.
- Match the surrounding file's style. This codebase documents decisions in
  `@file` headers and inline comments that name the failure a line prevents
  (`vite.config.ts` is the clearest example) — write in that register.
- Prefer adding to an existing entry over creating a new published export; each
  new entry means edits in `vite.config.ts`, `exports` and `files`.

## Commits

Gitmoji + conventional commits, lowercase subject, imperative mood:

```
✨ feat(cli): archive a page into a folder with --page
✨ feat(native-app-wrapper): bundle yt-dlp as a Tauri sidecar
📝 docs(skill): cover api2ai, the transfer CLI, and the rest of the surface
💄 feat(homepage): show the full README badge set under the hero tagline
```

## Pull requests

- Target `master`. One concern per PR.
- Say what changed and why; note whether the published surface moved.
- If you changed the skill, confirm `sync-skill-docs.mjs --check` passes.

## Tests

```bash
npm test                 # vitest, watch
npm run test:coverage    # what CI runs
npm run test:cli         # a real download, end to end
```

Tests live in `test/*.test.ts`; coverage is over `packages/**/src/**`, configured
inside `vite.config.ts`. Add tests for behaviour changes — especially in
`flow-control.ts` and the transfer layer, where the failure modes are timing and
network shaped and only a test pins them down.

## CI

| Workflow | Trigger | What it guards |
| --- | --- | --- |
| `tests.yml` | push to master, PR | `npm install` then `npm run test:coverage`, uploaded to Codecov |
| `pages.yml` | changes to `grab-help-docs/`, `packages/`, the lockfile | Static-exports the docs and publishes to GitHub Pages. Uses `npm ci` deliberately. |
| `npm-publish.yml` | push to master | Publishes to npm |

## Publishing

`prepublishOnly` runs the build, so `dist/` in a publish always matches source.
`npm run ship` is the maintainer's release path (standard-version patch bump,
drops the regenerated changelog, publishes).

`files` controls what is shipped: `dist`, `src`, the yt-dlp installer, and the
CLI spinner frame data. A new runtime-loaded asset has to be added there or it
will be missing for consumers while working locally.

## Security

- Never commit secrets, credentials or API keys.
- `postinstall` downloads a yt-dlp binary (`scripts/install-yt-dlp.mjs`). Treat
  changes to it as security-relevant: it fetches and executes a third-party
  binary on every consumer's machine.
- The license is PROSPER; contributions are under it.

## Agent-specific rules

- Do not recreate the root `docs/` folder; it was vestigial and PR #47 deleted
  it — see [documentation.md](documentation.md).
- The Vercel build is driven by the **root** `vercel.json` (Root Directory is
  the repository root). A red Vercel check was a project misconfiguration for a
  long time — read [documentation.md](documentation.md) before assuming it is
  your diff.
- Do not edit `grab-help-docs/content/docs/claude-skill.mdx` by hand; edit the
  skill and regenerate.
- Do not add an import to `grab-api/src/` that is not a Node builtin.
- Do not turn the runtime `import()` of `extract-webpage` into a static import.
- Use npm, not bun or yarn.
