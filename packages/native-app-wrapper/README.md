<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://grab.js.org"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/GRAB-URL" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/GRAB-URL?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/GRAB-URL?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/GRAB-URL?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/GRAB-URL" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/GRAB-URL.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" alt="npm" /> <img src="https://img.shields.io/badge/Tauri-24C8D8?logo=tauri&logoColor=white" alt="Tauri" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

# native-app-wrapper

A [Tauri](https://tauri.app) shell that turns one JSON profile into a native desktop
(Windows/macOS/Linux) and mobile (Android/iOS) app. It packages one of two things:

- **A website** (`"mode": "remote"`) — a titled window that loads the site directly, plus the
  OS-level plumbing a plain webview doesn't get for free: a real app icon on every platform, a
  Google-OAuth-compatible login handoff, and a fullscreen toggle.
- **A command-line tool** (`"mode": "local"`) — a bundled HTML frontend backed by the CLI itself,
  shipped alongside the app binary as a [Tauri sidecar](https://v2.tauri.app/develop/sidecar/), so
  the app runs with no Node, Python, or other runtime installed on the user's machine. See
  [`docs/LOCAL_APPS.md`](docs/LOCAL_APPS.md).

[`profiles/grab-url.json`](profiles/grab-url.json) is a working example of the second kind, and
the one this repository ships: **Grab URL**, a window over `yt-dlp` that downloads video and
audio from the ~720 media sites grab-url knows about, with the downloader bundled inside the app
so nothing has to be installed first. See [The Grab URL app](#the-grab-url-app) below.

## What this is not

Not a place for app-specific UI or logic. In remote mode the wrapped site provides all of that; in
local mode the app's own `dist/` and its sidecar do. This package's job stops at: open a window,
register the app's identity (icon, name, bundle id) with each OS, hand a browser-based OAuth login
back to that window, and expose the bundled CLI's output to the bundled frontend. Anything more
belongs in the app being wrapped.

## The Grab URL app

The profile this repository ships builds a local-mode app around `yt-dlp`:

```bash
cd packages/native-app-wrapper
npm install
npm run dev            # configures, fetches the sidecar, opens the window
npm run build:desktop  # .msi / .dmg / .AppImage with yt-dlp inside
```

There is only one non-example profile, so no `--profile` flag is needed anywhere.

**The sidecar is downloaded, not compiled.** `profiles/grab-url.json` points `sidecar.build` at
the repository's own [`scripts/install-yt-dlp.mjs`](../../scripts/install-yt-dlp.mjs), which
fetches the official standalone yt-dlp release for the target and writes it to the `{out}` path
`build-sidecar.mjs` asks for:

```jsonc
"sidecar": {
  "name": "yt-dlp",
  "args": ["--version"],                                        // for sidecar_output
  "downloadArgs": ["--newline", "--no-playlist", "…"],          // for download_media
  "build": "node ../../scripts/install-yt-dlp.mjs --sidecar --out {out}"
}
```

That script reads the target triple back out of `{out}` rather than deriving it from
`process.platform`, so the asset it picks always matches the name Tauri will look for — including
on the hosts a Node mapping gets wrong (musl, 32-bit ARM). Cross-compiling needs nothing extra;
`npm run sidecar:refresh` re-downloads a binary that is already there.

**The frontend** is [`dist/index.html`](dist/index.html): a URL field, an audio-only checkbox, and
a status pane. It calls the two commands below directly through `window.__TAURI__.core.invoke` —
no build step, no npm dependency.

### The two commands

| Command           | Caller supplies | What it runs                                           |
| ----------------- | --------------- | ------------------------------------------------------ |
| `sidecar_output`  | nothing         | `yt-dlp` + `sidecar.args` — used to show the version   |
| `download_media`  | a URL, a bool   | `yt-dlp` + `sidecar.downloadArgs` + Downloads dir + URL |

`download_media` is the "several commands with several fixed argument lists" case
`sidecar_output` refuses to become. A downloader is useless without a target, so exactly one
value crosses from the page — the URL — and it must parse as `http(s)`. That parse is the guard:
a string like `--exec` is not a URL, so it is rejected before it can reach argv. Every flag stays
fixed, the destination is whatever the OS calls Downloads, and `audio_only` is a bool rather than
a format name so that no second caller-supplied string flows into the argument list either. Both
commands also refuse to run unless the calling window is showing bundled content.

## Quick start

Scaffold a copy of the wrapper for your own app:

```bash
cd packages/native-app-wrapper
node bin/cli.js init ../../apps/my-app/native --profile-file ./my-app.json
cd ../../apps/my-app/native
npm install
npm run dev
```

`init` copies the wrapper's sources into the target directory, gives that copy your profile as its
only identity, regenerates the Tauri config and Rust constants from it, renames the crate, and
draws a placeholder icon set so the copy builds immediately. It also leaves out what the profile
doesn't use: a desktop-only profile gets no `android:build` script, an offline CLI app gets no
guide to browser OAuth handoffs. Nothing links back to this package afterward — the copy is a
standalone app you can commit next to the thing it wraps, and updating it later means copying the
changed scripts across, not re-running `init` over your own `dist/`.

To work on this package itself instead, `npm run dev` here opens a window on the untouched
`profiles/example.json` (`https://example.com`), which is what the checked-in
`src-tauri/tauri.conf.json` is generated from.

## Layout

```
native-app-wrapper/
├── bin/cli.js             # init / configure / icons
├── profiles/              # one JSON file = one app identity (see profiles/README.md)
│   └── example.json        #   the template, and this package's own default
├── scripts/
│   ├── profile.mjs                   # loads + validates a profile; one definition of the schema
│   ├── configure.mjs                 # profile -> tauri.conf.json, generated_config.rs, remote.json
│   ├── build-sidecar.mjs             # profile's sidecar.build -> src-tauri/binaries/<name>-<triple>
│   ├── generate-icons.mjs            # profile's iconSource -> full src-tauri/icons/ set (Tauri CLI)
│   ├── generate-placeholder-icons.mjs # draws a buildable icon set with no artwork and no deps
│   └── lib/png.mjs                   # the PNG/ICO/ICNS writers that make the above possible
├── src-tauri/
│   ├── src/lib.rs          # window setup, deep-link OAuth handoff, sidecar bridge, fullscreen toggle
│   ├── capabilities/       # Tauri's permission grants (default.json + a generated remote.json)
│   ├── icons/              # generated; checked in so a fresh clone builds
│   └── tauri.conf.json     # generated by configure
├── assets/icon-source.png # the 1024px master `iconSource` points at by default
├── dist/                  # the bundled frontend (a placeholder in remote mode; the app in local mode)
└── docs/
    ├── BUILDING.md         # local dev/build commands and release builds
    ├── LOCAL_APPS.md       # packaging a CLI: the sidecar bridge and the bundled frontend
    ├── OAUTH.md            # why login needs a system browser + deep link, and how it works here
    ├── MOBILE.md           # Android/iOS host requirements and gen/android, gen/apple
    └── APP_STORES.md       # Microsoft Store, Mac App Store, iOS App Store, Google Play
```

## Why generated config instead of a hand-edited `tauri.conf.json`

An app's identity shows up in five places that must agree: the Tauri config, the Rust deep-link
scheme, the Rust sidecar name, the remote capability's origin scope, and the icon set. Hand-editing
means five chances to drift. `scripts/configure.mjs` writes all of them from the profile, so the
profile is the only file anyone edits, and CI can assert the generated files still match it.

## Why a window, not a bundled copy of a remote site

In remote mode, `tauri.conf.json`'s main window points its `url` straight at the profile's site over
HTTPS — there's no local copy of the app's UI to keep in sync with the real site
(`build.frontendDist` still points at `dist/`, an unused placeholder Tauri's bundler requires to
exist). The tradeoff: the app needs network access to be useful, same as opening the site in a
browser tab would. Local mode is the opposite tradeoff — everything is bundled, nothing is fetched.
