# packages/grab-url

**This is the published package.** `npm install grab-url` installs exactly what
this directory produces. It contains no library source of its own — only the
build that bundles its siblings, and the `package.json` that is the public
surface.

```
package.json      # name, version, exports, bin, files — what npm ships
vite.config.ts    # the one build: packages/* sources → dist/
scripts/
  install-yt-dlp.mjs      # runs on postinstall, and ships in the tarball
  sync-package-docs.mjs   # prepack: copies the root README + LICENSE in
dist/                     # build output, gitignored
```

## Rules

1. **No source belongs here.** A change to `grab()` goes in
   `packages/grab-api/src`, a change to the CLI in `packages/grab-url-cli/src`.
   This package only decides what gets bundled and how it is exposed.
2. **Adding an export means three edits**: `build.lib.entry` in
   `vite.config.ts`, `exports` in `package.json`, and `files` if new source has
   to ship. See [`../../.claude/architecture/build.md`](../../.claude/architecture/build.md).
3. **Entry paths resolve from `monorepoPackages`**, never from the working
   directory, so `npm run build` at the root and `npm run build` in here produce
   the same bundle.
4. **`README.md`, `LICENSE.md` and `dist/` here are generated and gitignored.**
   The README and licence are copied from the repo root by `prepack`; edit the
   root copies. Never commit any of the three.
5. **The devDependencies are not decoration.** An `npm install` inside this
   directory links only what is declared here, so `archiver-web`, `fflate`,
   `jszip` and the Vite toolchain are what let the build run standalone rather
   than only from a root workspace install.
6. **Don't touch the two traps** documented in `architecture/build.md`: the
   `useClientDirective` plugin (the quantum-sphere `"use client"` directive) and
   the shebang banner, which is keyed on entry *name*.

## Checks

```bash
npm run build                              # from the root, or from here
npm pack --dry-run --workspace grab-url    # what the tarball will contain
```
