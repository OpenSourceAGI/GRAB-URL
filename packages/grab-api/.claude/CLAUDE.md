# CLAUDE.md — `@grab-url/grab-api`

**Private — never published.** This package *is* `grab-url`: the root Vite build
compiles `src/index.ts` into `dist/grab-api.*` and the root `package.json`
exposes it as the package's main entry.

So its public API is `grab-url`'s public API. There is no separate
`@grab-url/grab-api` for anyone to install, and a breaking change here is a
breaking change to the published package.

## Zero runtime dependencies

That is the product claim for `grab()`, and it is a repo-wide ground rule. An
import added to this package's `src/` that is not a Node builtin breaks it —
check before reaching for a helper library.

## Two entries, and the difference is the point

| Source | Ships as | Difference |
| --- | --- | --- |
| `src/index.ts` | `grab-url` | Everything bundled |
| `src/index.slim.ts` | `grab-url/slim` | `archiver-web` and `linkedom` externalized |

The slim build exists so a browser consumer doesn't pay for the heavy
dependencies. **Anything you add to `index.ts` that the slim entry also imports
must stay externalizable**, or `slim` quietly stops being slim. Check
`slimExternalPkgs` in `vite.config.ts` when adding a dependency.

## What the client guarantees

Caching, retries, rate limiting and request dedupe on every call — that is the
reason to use it over `fetch`. Consumers (including `debate-api-client` in the
sibling debate repo, and `api2client` here) rely on those behaviours being
automatic. Don't add a path that bypasses them.

## Layout

`src/core/` · `src/common/` · `src/response/` · `src/devtools/` ·
`src/index.ts` · `src/index.slim.ts`

## Rules

- **It must run in a browser.** No Node builtins on the library path — the CLI
  is a different entry, with a different externals list.
- Tests live in the **root `test/`** folder (`test/grab.test.ts`), not here.
- After changing it: `npm run build`, then confirm both `dist/grab-api.*` and
  `dist/grab-api-slim.*` are produced.
