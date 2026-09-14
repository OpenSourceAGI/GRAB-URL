# CLAUDE.md — `quantum-sphere-loading-icon`

**npm name:** `quantum-sphere-loading-icon` (directory:
`quantum-sphere-loading-animation`). Published on its own, and built into
`dist/quantum-sphere.*` (exposed as `grab-url/icons/quantum-sphere`).

A parabolic spherical orbital loading component for **React and Svelte**.

## The two build rules that must not be broken

Both are enforced in the root `vite.config.ts`, and both exist because of a real
failure:

1. **React is externalized.** `react`, `react-dom`, `react/jsx-runtime` and
   `react/jsx-dev-runtime` never enter the bundle. A second React copy makes
   every hook in `QuantumOrbital` throw *"Invalid hook call"*. No other entry
   imports React, so this costs nothing elsewhere.
2. **`"use client"` is re-applied in `generateBundle`.** Rollup drops the
   source's module-level directive, and a `banner` does not survive terser,
   which re-parses the chunk and discards a directive it reads as dead code.
   Writing it after minification is the only point where it sticks. Without it,
   a React Server Component importing the sphere fails on the first hook.

If you are debugging "Invalid hook call" or an RSC boundary error from this
component, those two are where to look — not in the component.

## Layout

`src/icons.ts` (the built entry) · `src/index.ts` · `src/react/` · `src/svelte/`
· `src/shared/` · `src/types/`

The Svelte sources and `demo/` are excluded from the type build and from
coverage. Keep genuinely shared logic in `src/shared/` so the two framework
wrappers stay thin.
