# CLAUDE.md — `grab-api.js`

**Published twice.** This source is compiled by two configs into two npm
packages:

| Built by | Into | Published as |
| --- | --- | --- |
| `packages/grab-url/vite.config.ts` | `packages/grab-url/dist/grab-api-slim.*` · `grab-api.*` | `grab-url` and `grab-url/full` |
| `packages/grab-api/vite.config.ts` | `packages/grab-api/dist/grab-api-slim.*` · `grab-api.*` | `grab-api.js` and `grab-api.js/full` |

`grab-url` adds the loading icons (`/animations`, `/icons/quantum-sphere`);
`grab-api.js` is `grab()` and `log()` alone. Otherwise they are the same bytes
from the same files, so **a breaking change here is a breaking change to both**,
and both need a version bump.

`test/packaging.test.ts` compares the exported names of the two builds and fails
if they drift.

A consumer installs one or the other, **never both**: two packages means two
modules, two `grab.mock` registries, two `grab.log` arrays and two caches. Any
doc that mentions the pair has to say so.

## Zero runtime dependencies

That is the product claim for `grab()`, and it is a repo-wide ground rule. An
import added to this package's `src/` that is not a Node builtin breaks it —
check before reaching for a helper library.

## Two entries, and which one is the default is the point

| Source | Ships as | Carries |
| --- | --- | --- |
| `src/index.slim.ts` | **`grab-url`** · `grab-url/slim` · **`grab-api.js`** · `grab-api.js/slim` | `request-executor-slim.ts` — fetch, mocks, no post-processing |
| `src/index.ts` | `grab-url/full` · `grab-api.js/full` | the above plus `content-processors.ts`: unzip (archiver-web) and DOM parsing (linkedom) |

Since 3.0 the **bare import is the slim one** in both packages, so an ordinary
`import grab from "grab-url"` costs ~16 kB (~7 kB gzipped) and no DOM parser.
The `/slim` subpath is kept as an alias pointing at the identical files, which
means one module instance and one `grab.mock` across both specifiers *within a
package* — across the two packages it is still two modules, which is why a
consumer picks one.

What keeps it slim is the module graph: `index.slim.ts` imports
`request-executor-slim.ts`, which never touches `content-processors.ts`. So
**anything you add to a module that `index.slim.ts` shares with `index.ts` —
`core/`, `common/`, `response/`, `devtools/` — is paid for by every consumer of
the default import.** Heavy work belongs behind `content-processors.ts`, which
only the full entry reaches, and behind a lazy `import()` inside it.

`test/packaging.test.ts` walks the built bundles and fails if linkedom,
archiver-web, jszip or fflate becomes reachable from either package's default
entry — both dists name it `grab-api-slim.es.js`.

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
- After changing it, build **both** packages — `npm run build` in
  `packages/grab-url` *and* in `packages/grab-api` — then run
  `test/packaging.test.ts`. Building only one leaves the drift check comparing a
  fresh bundle against a stale one.
- Alias targets in either vite config stay **extensionless**. A `.ts` there ends
  up inside the emitted `.d.ts` as `from './…/log-json.ts'`, which is not in the
  tarball and which a consumer cannot import. See
  [`build.md`](../../../.claude/architecture/build.md#aliases).
