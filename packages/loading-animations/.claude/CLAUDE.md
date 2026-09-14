# CLAUDE.md — `loading-animations`

**Published on its own**, and built into `dist/animations.*` (exposed as
`grab-url/animations`).

Two halves, one package: **tree-shakable SVG spinners** (`src/svg/`) for the web
and **terminal spinners** (`src/cli/`) for the CLI.

## Tree-shakability is the feature

`src/svg/index.ts` is a **generated barrel**. It is produced by:

```bash
npm run make:icons
# npx export-svg-typescript -i packages/loading-animations/src/svg -o packages/loading-animations/src/svg/index.ts
```

So: **add or edit the `.svg` files, then regenerate the barrel.** Hand-editing
`index.ts` is overwritten on the next `npm run make`.

One export per animation, no module-scope side effects — a consumer importing
one spinner must not pull in all of them.

## Build notes

The `svg/` directory is excluded from coverage (it is generated assets, not
logic). The CLI spinners are the tested half.

## Layout

`src/svg/` (the SVGs + the generated barrel) · `src/cli/` (terminal spinners)

Tests: `test/icon.test.ts`.
