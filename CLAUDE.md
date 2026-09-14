# CLAUDE.md — GRAB-URL

Orientation for Claude agents working in this repository. Read this first; the
detailed notes live in [`.claude/architecture/`](.claude/architecture/).

**GRAB — Generate Request to API from Browser.** One `grab()` function with no
runtime dependencies that replaces a request library: auto-JSON, auto-unzip, DOM
parsing, dedupe, retry, timeout, rate limiting, caching, infinite scroll, mocks
and a devtools overlay. Around it: a media-downloading CLI, an OpenAPI client
generator, loading animations, and a Tauri wrapper.

## Ground rules

1. **npm, not bun or yarn.** `packageManager` pins `npm@11.19.1` and CI runs
   `npm install`. The Pages workflow uses `npm ci` deliberately — a floating
   resolve picks an incompatible fumadocs pair. Commit `package-lock.json`.
2. **The published package is `packages/grab-url`, and it has one build.** Most
   of `packages/*` are source folders, not independently published packages —
   `packages/grab-url/vite.config.ts` compiles all of them into one
   `packages/grab-url/dist/`, and `packages/grab-url/package.json` is what npm
   publishes as `grab-url`. The repo root is a private workspace root: it holds
   no entry points, no `exports` and no `dist/`. See
   [`architecture/build.md`](.claude/architecture/build.md).
3. **Zero runtime dependencies in `grab-api`.** That is the product claim. Adding
   an import to `packages/grab-api/src/` that is not a Node builtin breaks it.
4. **Documentation goes in the user guide**, `grab-help-docs/content/docs`.
   The root `docs/` folder is gone — it was a vestigial Jekyll stub from before
   GitHub Pages switched to deploying via Actions, and #47 deleted it. Put
   nothing there, and do not recreate it. See
   [`architecture/documentation.md`](.claude/architecture/documentation.md).
5. **The skill is generated.** `grab-help-docs/content/docs/claude-skill.mdx` is
   written from `skills/use-grab-request/SKILL.md` — edit the skill, then run
   `npm run make:skill`.
6. **`dist/` is never committed.** It is gitignored everywhere and rebuilt on
   demand; npm still ships it, because a `files` whitelist beats `.gitignore`
   and `prepublishOnly` runs the build. The one exception is
   `packages/native-app-wrapper/dist/`, which is hand-written Tauri source, not
   build output. The same goes for `packages/grab-url/README.md` and
   `LICENSE.md`: its `prepack` copies them in from the repo root so the tarball
   carries them, and they are gitignored so only the root copies are tracked.
   See [`architecture/build.md`](.claude/architecture/build.md).
7. **Never commit secrets**, credentials, or API keys.

## Where things live

| You want to change… | Go to |
| --- | --- |
| What npm publishes as `grab-url` (version, `exports`, `bin`, `files`) | `packages/grab-url/package.json` |
| The `grab()` request function | `packages/grab-api/src/` |
| The `grab-url` download CLI | `packages/grab-url-cli/src/` |
| ZIP extract/create | `packages/archiver-web/src/` |
| The OpenAPI → client generator | `packages/api2client/` |
| `log()` and the JSON printer | `packages/log-json/src/` |
| SVG / CLI spinners | `packages/loading-animations/src/` |
| The 3D orbital loader | `packages/quantum-sphere-loading-animation/` |
| The Tauri desktop/mobile wrapper | `packages/native-app-wrapper/` (not in the workspace globs) |
| Build entries, externals, bundling | `packages/grab-url/vite.config.ts` |
| Test config and coverage | `vitest.config.ts` at the root |
| Documentation | `grab-help-docs/content/docs/` |
| The agent skill | `skills/use-grab-request/SKILL.md` |

Full map: [`architecture/overview.md`](.claude/architecture/overview.md).

## Commands

```bash
npm install                 # never bun/yarn
npm run build               # vite build — the whole packages/grab-url/dist/
npm run make                # icons → skill → docs → build (the full refresh)
npm test                    # vitest
npm run test:coverage       # as CI runs it
npm run test:cli            # a real download, end to end
```

## Before you open a PR

- `npm run test:coverage`, and `npm run build` if you touched anything bundled.
- If you changed the skill, run `npm run make:skill` and commit the regenerated
  docs page; `--check` fails when it is stale.
- Commit style is **gitmoji + conventional commits**:
  `✨ feat(cli): archive a page into a folder with --page`. See
  [`architecture/conventions.md`](.claude/architecture/conventions.md).
- Target `master`. Keep the PR focused.

## Detailed notes

| Note | Covers |
| --- | --- |
| [overview.md](.claude/architecture/overview.md) | What each package does and how a request flows through `grab()` |
| [build.md](.claude/architecture/build.md) | The single root build, entries, externals, and the traps in it |
| [documentation.md](.claude/architecture/documentation.md) | The Fumadocs site, the two deployments, the deleted root `docs/`, and the broken Vercel setting |
| [conventions.md](.claude/architecture/conventions.md) | Code style, commits, PRs, CI, publishing |
| [monorepo.md](.claude/architecture/monorepo.md) | Workspaces, npm vs pnpm, which packages actually publish, where the tests live |

Each `packages/*` folder and `grab-help-docs` also has its own `CLAUDE.md` with
the rules and traps specific to working in it.
