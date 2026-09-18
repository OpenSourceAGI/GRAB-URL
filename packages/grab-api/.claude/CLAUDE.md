# CLAUDE.md — `@grab-url/grab-api`

**Private — never published.** This package *is* `grab-url`:
`packages/grab-url/vite.config.ts` compiles `src/index.slim.ts` into
`dist/grab-api-slim.*` and `packages/grab-url/package.json` exposes that as the
package's **main entry**.

So its public API is `grab-url`'s public API. There is no separate
`@grab-url/grab-api` for anyone to install, and a breaking change here is a
breaking change to the published package.

## Zero runtime dependencies

That is the product claim for `grab()`, and it is a repo-wide ground rule. An
import added to this package's `src/` that is not a Node builtin breaks it —
check before reaching for a helper library.

## Two entries, and which one is the default is the point

| Source | Ships as | Carries |
| --- | --- | --- |
| `src/index.slim.ts` | **`grab-url`** and `grab-url/slim` | `request-executor-slim.ts` — fetch, mocks, no post-processing |
| `src/index.ts` | `grab-url/full` | the above plus `content-processors.ts`: unzip (archiver-web) and DOM parsing (linkedom) |

Since 3.0 the **bare import is the slim one**, so an ordinary
`import grab from "grab-url"` costs ~16 kB (~7 kB gzipped) and no DOM parser.
`grab-url/slim` is kept as an alias pointing at the identical files, which means
one module instance and one `grab.mock` across both specifiers.

What keeps it slim is the module graph: `index.slim.ts` imports
`request-executor-slim.ts`, which never touches `content-processors.ts`. So
**anything you add to a module that `index.slim.ts` shares with `index.ts` —
`core/`, `common/`, `response/`, `devtools/` — is paid for by every consumer of
the default import.** Heavy work belongs behind `content-processors.ts`, which
only the full entry reaches, and behind a lazy `import()` inside it.

`test/packaging.test.ts` walks the built bundles and fails if linkedom,
archiver-web, jszip or fflate becomes reachable from `grab-api-slim.es.js`.

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
  is a different package (`grab-url-cli`), with its own build and its own
  externals list.
- Tests live in **`packages/grab-url/test/`** (`grab.test.ts`), not here.
- After changing it: `npm run build` in `packages/grab-url`, then confirm both
  `dist/grab-api-slim.*` (the default) and `dist/grab-api.*` (`/full`) are
  produced, and run `test/packaging.test.ts`.
