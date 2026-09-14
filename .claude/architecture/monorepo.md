# Monorepo Mechanics

## Workspaces

```json
"workspaces": ["packages/*", "!packages/native-app-wrapper", "grab-help-docs"]
```

Note the **negation**: `packages/native-app-wrapper` is deliberately excluded.
It is a Tauri scaffold with a Rust toolchain requirement — it is not installed
by a root `npm install` and nothing at the root builds or tests it.

`pnpm-workspace.yaml` lists the same globs *without* the negation, for anyone
using pnpm.

## Package manager

**npm.** `packageManager` pins `npm@11.19.1`, the committed lockfile is
`package-lock.json`, and CI runs `npm install` (tests) and `npm ci` (Pages).
There is no `.npmrc`: its one key, `package-manager-strict=false`, is a pnpm
setting that npm 11 warns about on every install, so it now lives in
`pnpm-workspace.yaml` as `packageManagerStrict: false`.

A `pnpm-workspace.yaml` exists but there is **no pnpm lockfile**, so pnpm is
tolerated rather than supported. Do not switch, and do not commit a second
lockfile — the lockfile is what CI installs from.

This is the one repo in this family that is not on Bun. `bun x standard-version`
appears in the `ship` script, and `npm-publish.yml` sets up Bun, but installs
and tests are npm.

## Two kinds of package

| Kind | Directories | What "publishing" means |
| --- | --- | --- |
| **Internal** | `grab-api`, `grab-url-cli`, `log-json` (`@grab-url/*`, all `"private": true`) | Never published. Compiled into `grab-url`'s `dist/` by the root build. |
| **Published** | `api2client`, `archiver-web`, `loading-animations`, `quantum-sphere-loading-animation` | Published on their own **and** bundled into a `grab-url` entry |
| **Excluded** | `native-app-wrapper` | Outside the workspace; its own thing |

Consequence: editing `packages/grab-api/src` changes the `grab-url` package.
There is no separate `@grab-url/grab-api` for a consumer to install, so its
"public API" is really `grab-url`'s.

## Turbo

`turbo.json` defines exactly one task:

```json
"build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] }
```

Turbo is used for one thing here — building `grab-help-docs`
(`npm run make:docs` → `turbo run build --filter=grab-help-docs`). Everything
else runs through root npm scripts and the single Vite build. Don't reach for
turbo filters expecting the other repos' task graph; it isn't there.

## Tests

All tests live in the **root `test/` folder** and run under Vitest through the
same `vite.config.ts` as the build — so they see the same aliases and externals
the shipped bundle does.

```
test/grab.test.ts          test/downloader.test.ts   test/ytdlp.test.ts
test/api2client.test.ts    test/archiver.test.ts     test/aria2.test.ts
test/command.test.ts       test/icon.test.ts         test/log.test.ts
test/page-archive.test.ts
```

There are no per-package test folders. A new test for
`packages/whatever/src/thing.ts` goes in `test/thing.test.ts`.

Coverage (v8) includes `packages/**/src/**` and excludes `dist`, `.d.ts`,
Svelte sources, `svg/` and `demo/` directories.

```bash
npm run test
npm run test:coverage    # what CI runs
npm run test:ui
npm run test:cli         # a real download against a live Ubuntu ISO URL
```

`test:cli` hits the network and downloads a large file. It is a smoke test, not
part of the suite — don't wire it into CI.

## `postinstall` downloads yt-dlp

`scripts/install-yt-dlp.mjs --postinstall` runs on every install. If an install
appears to hang or fails behind a proxy, that is where to look:

```bash
npm run ytdlp            # force a re-download
npm run ytdlp:sidecar    # fetch the sidecar binary for a packaged app
```
