# CLAUDE.md — `api2client`

**Published on its own**, from its own `vite.config.ts`.

A [Hey API](https://heyapi.dev) client that sends generated OpenAPI SDK requests
through **`grab-api.js`** — the bare `grab()` without grab-url's loading icons —
instead of fetch or axios, so every generated operation
inherits caching, retries, rate limiting and request dedupe.

## grab is external, and it is `grab-api.js`

`grab-api.js` (and its `/slim`, `/full` subpaths) plus `grab-url`,
`grab-url/slim` and `grab-url/full` are all in this config's `external` list,
so none of them is ever bundled here. Two reasons, both
load-bearing:

- **One module instance.** The generated Hey API client imports the *published
  package name*, and so does the app around it. Bundling a copy in would give
  the SDK its own `grab.mock`, `grab.log` and cache — stubs registered by the
  app would be invisible to it.
- **Size.** An OpenAPI response never needs the unzipper, the DOM parser or
  grab-url's loading icons. `src/` imports bare `grab-api.js`, whose default
  entry is the slim build, and the only dependency is `grab-api.js`. Never
  import `grab-url` or `grab-api.js/full` here.

`packages/grab-url/vite.config.ts` aliases `grab-api.js` and both subpaths
to the in-repo source so an in-monorepo build resolves exactly as a consumer's
does. If you change how this package imports grab, check that alias.

`packages/grab-url/test/packaging.test.ts` asserts the externals list, the
`grab-api.js` dependency, and that `dist/index.es.js` imports `grab-api.js`
and stays under 100 kB (it is ~20 kB).

## Rules

- **Generated SDK code is output.** This package is the *adapter*, not the
  generated client — fix behaviour here, never by editing someone's generated
  SDK.
- Preserve the Hey API client contract, including its error shape. Consumers
  generated against Hey API expect it.
- The point of the package is that operations get grab's guarantees
  automatically. Don't add a path that falls back to bare `fetch`.

## Layout

`src/index.ts` · `src/client.ts` · `src/generate.ts` · `src/cli.ts` ·
`src/core/` · `src/types.ts` · `src/utils.ts`

Tests: `packages/grab-url/test/api2client.test.ts`. Example: `examples/api2client-petstore`.
