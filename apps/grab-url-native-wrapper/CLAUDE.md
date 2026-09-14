# CLAUDE.md — `native-app-wrapper`

**Excluded from the workspace on purpose.** The root `workspaces` array carries
an explicit negation:

```json
"workspaces": ["packages/*", "!packages/native-app-wrapper", "grab-help-docs"]
```

So a root `npm install` does not install it, the root Vite build does not build
it, and the root test run never reaches it. Nothing at the root will tell you
you broke it.

A Tauri scaffold that packages a website, or a bundled CLI, as a native desktop
app.

## Things that bite

- **Rust toolchain required.** A machine that builds the rest of this repo
  cannot necessarily build this.
- **yt-dlp ships as a Tauri sidecar** here. Sidecar binaries are referenced with
  platform-suffixed names — get one wrong and it fails on exactly one OS, at
  runtime, after packaging. `npm run ytdlp:sidecar` fetches it.
- Native behaviour (window, tray, updater, deep links) lives on the Rust side,
  not in the web layer.
- A green build on one platform says nothing about the others.

Install and build from inside this directory, and say in the PR how you verified
it.
