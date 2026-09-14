# CLAUDE.md — `api2client`

**Published on its own** — and also reachable through the `grab-url` build.

A [Hey API](https://heyapi.dev) client that sends generated OpenAPI SDK requests
through **`grab-url`** instead of fetch or axios, so every generated operation
inherits caching, retries, rate limiting and request dedupe.

## The alias that makes this work

`vite.config.ts` aliases the bare specifier `"grab-url"` to
`packages/grab-api/src/index.ts`, because the generated Hey API client imports
the **published package name**. Inside the monorepo that has to resolve to the
same source — otherwise a build ends up with two copies of the client and the
cache/dedupe layers stop being shared.

If you change how this package imports `grab-url`, check that alias.

## Rules

- **Generated SDK code is output.** This package is the *adapter*, not the
  generated client — fix behaviour here, never by editing someone's generated
  SDK.
- Preserve the Hey API client contract, including its error shape. Consumers
  generated against Hey API expect it.
- The point of the package is that operations get `grab-url`'s guarantees
  automatically. Don't add a path that falls back to bare `fetch`.

## Layout

`src/index.ts` · `src/client.ts` · `src/generate.ts` · `src/cli.ts` ·
`src/core/` · `src/types.ts` · `src/utils.ts`

Tests: `test/api2client.test.ts`. Example: `examples/api2client-petstore`.
