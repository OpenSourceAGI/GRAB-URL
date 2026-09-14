<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://grab.js.org"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/GRAB-URL/tree/master/packages/grab-url-cli"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/GRAB-URL" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/GRAB-URL?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/GRAB-URL?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/GRAB-URL?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/GRAB-URL" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/GRAB-URL.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" alt="npm" />
</p>
<!-- template-git-repo:badges:end -->

# @grab-url/cli

CLI front end for [`grab-url`](https://grab.js.org). Fetches API responses, downloads files over HTTP(S), pulls video and audio from **700+ media sites** with `yt-dlp`, and transfers over **SFTP**, **BitTorrent** and **magnet** links — auto-detecting which mode to use from the URL — with colored multi-file progress bars, resumable transfers, keyboard controls, and detachable background jobs.

```bash
npx grab-url <url> [options]
```

## Examples

```bash
# Fetch JSON/text from an API and save to output.json
npx grab-url https://api.example.com/data

# Download a file
npx grab-url https://releases.ubuntu.com/24.04.2/ubuntu-24.04.2-live-server-amd64.iso

# Download multiple files concurrently
npx grab-url https://example.com/file1.zip https://example.com/file2.zip

# Save the first URL to a custom filename
npx grab-url https://example.com/file.iso -o ubuntu.iso

# Pass query params as JSON
npx grab-url https://api.example.com/search -p '{"q":"hello","limit":10}'

# Print to stdout instead of writing a file
npx grab-url https://api.example.com/data --no-save

# Media sites are detected by domain and downloaded with yt-dlp
npx grab-url "https://www.youtube.com/watch?v=VIDEO_ID"

# Grab just the audio, in a container of your choosing
npx grab-url https://soundcloud.com/artist/track -a mp3

# Pick a format, or pass any yt-dlp flag straight through
npx grab-url https://vimeo.com/76979871 -f "bestvideo[height<=720]+bestaudio"
npx grab-url https://www.twitch.tv/videos/123 --ytdlp-args "--limit-rate 2M"

# Pull a file over SFTP (aria2c)
npx grab-url sftp://user@host/srv/backup.tar.gz --password hunter2

# Download a torrent or a magnet link into ./downloads
npx grab-url ./ubuntu.torrent -d ./downloads
npx grab-url "magnet:?xt=urn:btih:HASH" -d ./downloads --seed

# Detach immediately and keep transferring in the background
npx grab-url https://example.com/big.iso --background

# See what is still running in the background
npx grab-url --jobs

# Archive a page into ./<Page Title>/ - full page, article, cite, transcript, video
npx grab-url https://example.com/article --page
```

## Options

| Flag                | Alias | Type    | Description                                                                |
| ------------------- | ----- | ------- | -------------------------------------------------------------------------- |
| `--output <file>`   | `-o`  | string  | Output filename (default: `output.json` for APIs, derived from URL for files) |
| `--params <json>`   | `-p`  | string  | JSON string of query parameters, e.g. `'{"key":"value"}'`                 |
| `--no-save`         |       | boolean | Don't save output to a file — just print to console                       |
| `--page`             | `-P`  | Archive each URL into a folder named after its page title                   |
| `--no-video`         |       | With `--page`, skip the yt-dlp video download                             |
| `--video-format <f>` |       | With `--page`, format selector passed to `yt-dlp -f`                       |
| `--lang <codes>`     |       | With `--page`, comma-separated transcript languages (default `en`)         |
| `--background`      | `-b`  | boolean | Detach at once and keep transferring in the background, logging to a file  |
| `--jobs`            |       | boolean | List background transfers that are still running, then exit                |
| `--log <file>`      |       | string  | Log file for background transfers (default: `<state-dir>/logs/`)          |
| `--no-bg-prompt`    |       | boolean | On Ctrl+C, cancel right away instead of offering the background handoff    |
| `--dir <path>`      | `-d`  | string  | Destination directory for downloads and sftp / torrent / magnet transfers  |
| `--seed`            |       | boolean | Keep seeding a torrent after it completes (default: stop at 100%)          |
| `--connections <n>` | `-c`  | number  | Connections per server for SFTP transfers, 1–16 (default 8)                |
| `--user <name>`     |       | string  | Username for SFTP transfers                                                |
| `--password <pw>`   |       | string  | Password for SFTP transfers                                                |
| `--ssh-host-key <d>`|       | string  | Expected SFTP host key digest, e.g. `sha-1=b030503…` — aborts on mismatch  |
| `--aria2-args <s>`  |       | string  | Extra space-separated flags passed straight to `aria2c`                    |
| `--format <sel>`    | `-f`  | string  | yt-dlp format selector, e.g. `bestvideo+bestaudio` or `137`                |
| `--audio <fmt>`     | `-a`  | string  | Extract audio only, in this container (`mp3`, `m4a`, `opus`, `best`)       |
| `--playlist`        |       | boolean | Download the whole playlist, not just the linked item                      |
| `--cookies-from-browser <b>` | | string | Read cookies from a browser (`chrome`, `firefox`, …) for gated media |
| `--ytdlp`           |       | boolean | Force every URL through yt-dlp, even off the known-site list               |
| `--no-ytdlp`        |       | boolean | Never use yt-dlp — fetch media-site URLs as plain pages                    |
| `--ytdlp-args <s>`  |       | string  | Extra space-separated flags passed straight to `yt-dlp`                    |
| `--install-ytdlp`   |       | boolean | Download the `yt-dlp` binary for this machine, then exit                    |
| `--help`            | `-h`  |         | Show help                                                                  |
| `--version`         |       |         | Show version                                                               |

The CLI auto-detects **download mode** when more than one URL is passed or any URL looks like a file. Otherwise it runs in **API mode** and tries to parse JSON.

## Media sites

A URL you copy from YouTube, Twitch, Vimeo, SoundCloud or any of ~720 other sites points at a
player *page*, not at the media — fetching it directly saves a page of HTML. Those hosts are
recognised by domain and handed to [`yt-dlp`](https://github.com/yt-dlp/yt-dlp), which resolves
the real stream; its progress readout is parsed and shown in the same progress bar as every
other transfer.

```bash
grab-url "https://www.youtube.com/watch?v=VIDEO_ID"
# 🎬 youtube.com via yt-dlp 2026.08.19: youtube.com/VIDEO_ID
# 74% Big Buck Bunny [aqz-K…  ⠹ ████████░░░  38.2MB 51.4MB  6.1MB/s 0:00:02
```

Matching is by registrable suffix, so an entry covers the host and all its subdomains
(`youtube.com` also matches `music.youtube.com`). The list lives in
[`transfer/media-domains.ts`](src/transfer/media-domains.ts) and is sorted, so adding a site is a
one-line diff.

Detection is a default, not a rule:

| Flag          | Effect                                                                     |
| ------------- | -------------------------------------------------------------------------- |
| *(none)*      | URLs on listed sites go to yt-dlp; everything else uses `fetch()`           |
| `--ytdlp`     | Send **every** URL through yt-dlp, including hosts that are not listed      |
| `--no-ytdlp`  | Never use yt-dlp — fetch a media page as the plain HTML it is               |

`--no-ytdlp` wins when both are passed. A single command can mix modes freely:
`grab-url https://youtu.be/ID https://example.com/f.iso` downloads the video with yt-dlp and the
file with `fetch()`.

```bash
# Audio only, in a container of your choosing
grab-url https://soundcloud.com/artist/track -a mp3

# Cap the resolution, or name any yt-dlp format selector
grab-url https://vimeo.com/76979871 -f "bestvideo[height<=720]+bestaudio"

# A link carrying a playlist id grabs one item unless you ask for all of it
grab-url "https://www.youtube.com/watch?v=ID&list=PL123" --playlist

# Members-only or age-gated media, using a logged-in browser's cookies
grab-url https://www.youtube.com/watch?v=ID --cookies-from-browser firefox

# Anything else yt-dlp supports, passed straight through
grab-url https://www.twitch.tv/videos/123 --ytdlp-args "--limit-rate 2M --write-subs"
```

Interrupted downloads resume: yt-dlp leaves a `.part` file next to the output, so re-running the
same command picks up where it stopped.

### Getting the binary

`npm install grab-url` downloads the official standalone `yt-dlp` build for your platform into
`~/.grab-url/bin`. It is a single self-contained executable — no Python, no package manager and
no elevation — and the step is best-effort: a machine with no network or a locked-down `$HOME`
still installs grab-url fine, just without the media path until yt-dlp arrives another way.

```bash
npx grab-url --install-ytdlp     # fetch or refresh it by hand
npm run ytdlp:sidecar            # fetch it under Tauri's externalBin naming
```

At run time the binary is looked for in this order:

1. `GRAB_YTDLP_PATH` — an explicit path, which always wins.
2. **Bundled beside the host application** — a Tauri `externalBin` sidecar, a macOS `.app`
   bundle's `Resources`, or an AppImage's `usr/bin`. A packaged desktop build ships its own copy
   and never touches the user's `PATH`.
3. The managed copy in `~/.grab-url/bin` (`GRAB_YTDLP_DIR` redirects it), then `yt-dlp` on `PATH`.

Each candidate is *run*, not just stat-ed, so a stale sidecar built for another architecture
falls through to the next tier instead of failing the transfer. Set `GRAB_SKIP_YTDLP_INSTALL=1`
to opt out of the `postinstall` download entirely.

### Bundling yt-dlp in a Tauri app

`scripts/install-yt-dlp.mjs --sidecar` writes the binary under Tauri's target-triple naming, which
is what `bundle.externalBin` expects:

```bash
node scripts/install-yt-dlp.mjs --sidecar --out-dir src-tauri/binaries
# → src-tauri/binaries/yt-dlp-x86_64-unknown-linux-gnu
```

Cross-compiling? Pass the triple you are building for:

```bash
node scripts/install-yt-dlp.mjs --sidecar --target aarch64-apple-darwin
node scripts/install-yt-dlp.mjs --sidecar --target x86_64-pc-windows-msvc
```

Then declare it in `src-tauri/tauri.conf.json`, and run the fetch from `beforeBuildCommand` so a
clean checkout builds without a manual step:

```json
{
  "build": {
    "beforeBuildCommand": "node ../scripts/install-yt-dlp.mjs --sidecar"
  },
  "bundle": {
    "externalBin": ["binaries/yt-dlp"]
  }
}
```

Tauri strips the triple when it installs the sidecar, so the packaged app ends up with a plain
`yt-dlp` next to its executable — exactly where tier 2 of the search above looks.

## SFTP, torrents and magnet links

`fetch()` cannot speak SFTP or BitTorrent, so those targets are handed to
[`aria2c`](https://aria2.github.io/), whose progress readout is parsed and shown in the same
progress bar as every other transfer. A target is routed to aria2c when it is:

| Target                                | Kind      |
| ------------------------------------- | --------- |
| `sftp://user@host/path/file`          | `sftp`    |
| `magnet:?xt=urn:btih:…`               | `magnet`  |
| anything ending in `.torrent` (local path or URL) | `torrent` |

Everything else keeps using the built-in `fetch()` downloader, and a single command can mix
both: `grab-url https://a/f.iso ./b.torrent` downloads the torrent first, then the file.

**aria2c is required for these three kinds.** When it is missing, the CLI says so and prints the
install command for your platform (`brew install aria2`, `sudo apt install aria2`,
`winget install aria2.aria2`). Set `GRAB_ARIA2_PATH` to use a binary that is not on `PATH`. SFTP
and BitTorrent are compile-time features of aria2c, so a build without them is rejected up front
with the feature list it does have.

```bash
# Credentials inline, or as flags (flags keep them out of shell history files)
grab-url sftp://alice:hunter2@host:2222/srv/db.tar.zst
grab-url sftp://host:2222/srv/db.tar.zst --user alice --password hunter2

# Pin the host key; the transfer aborts if the server presents a different one
grab-url sftp://host/srv/db.tar.zst --user alice --password hunter2 \
  --ssh-host-key sha-1=b030503bb45f9f0e0a1e9c4a1e0b8f4c3d2e1f00

# Rename the downloaded file (sftp only — torrents carry their own names)
grab-url sftp://host/srv/db.tar.zst -o backup.tar.zst

# Throttle, or pass any other aria2c flag straight through
grab-url ./ubuntu.torrent --aria2-args "--max-overall-download-limit=2M --enable-dht=false"
```

Passwords are redacted (`sftp://alice:***@host`) everywhere the CLI echoes a URI — console
output, background logs and the job registry.

Interrupted transfers resume: aria2c keeps a `.aria2` control file next to the download, so
re-running the same command picks up where it stopped.

## Background transfers

Long transfers do not have to hold your terminal.

```bash
# Start detached right away — prints the PID and log path, then returns
grab-url https://example.com/big.iso --background

# List what is still running (dead jobs are pruned automatically)
grab-url --jobs

# Follow one, or stop it
tail -f .grab-downloads/logs/big.iso-….log
kill <pid>
```

Press **Ctrl+C** during any transfer and the CLI asks before it throws the work away:

```
🛑 Cancel — keep transferring in the background? [Y/n]
```

- **y** (or Enter) — the transfer is handed to a detached process that resumes from the partial
  file, and you get its PID and log path. The prompt auto-accepts after 15 seconds so a
  disconnected terminal does not strand the download.
- **n** — the transfer stops. The partial file and its resume state stay on disk, so running the
  same command again continues from there.

Ctrl+C a second time while the prompt is up answers **n**. `--no-bg-prompt` skips the question
entirely, and non-interactive shells (pipes, CI) always cancel outright.

Backgrounding re-launches the same command as a detached child rather than migrating live
sockets, so it relies on the same resume machinery as any interrupted transfer: HTTP transfers
resume when the server supports range requests, and SFTP/torrent transfers resume from aria2c's
control file. Job records and logs live under the download state directory
(`.grab-downloads/` by default, or `GRAB_DOWNLOAD_STATE_DIR`).

## Keyboard controls

| Key      | Action                                                    |
| -------- | --------------------------------------------------------- |
| `p`      | Pause / resume every transfer (aria2c and yt-dlp children included) |
| `a`      | Prompt for another URL to add to the running session       |
| `Ctrl+C` | Cancel — with the option to keep going in the background  |

## Programmatic API

The package also exports its primitives so you can embed the downloader in your own scripts:

```ts
import {
  MultiColorFileDownloaderCLI,
  ArgParser,
  isFileUrl,
  isValidUrl,
  generateFilename,
  getFileExtension,
} from "@grab-url/cli";

const downloader = new MultiColorFileDownloaderCLI();
await downloader.downloadMultipleFiles([
  { url: "https://example.com/a.zip", outputPath: "./a.zip", filename: "a.zip" },
  { url: "https://example.com/b.zip", outputPath: "./b.zip", filename: "b.zip" },
]);
```

## What's in this package

| File / Folder                                   | Purpose                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| [index.ts](index.ts)                            | CLI entry point — argv parsing, mode detection, dispatch           |
| [cli-args.ts](cli-args.ts)                      | Minimal `ArgParser` (yargs-like) and `isFileUrl` detection          |
| [file-downloader.ts](file-downloader.ts)        | `MultiColorFileDownloaderCLI` — concurrent download orchestrator    |
| [background.ts](background.ts)                  | Detached background jobs, the job registry, and the cancel prompt   |
| [cancel-state.ts](cancel-state.ts)              | Shared "user is cancelling" flag that quiets abort-induced errors   |
| [keyboard-controls.ts](keyboard-controls.ts)    | Pause / resume / cancel keybindings while downloads run            |
| [download-spinners.ts](download-spinners.ts)    | Spinner frames used by progress bars                               |
| [display/](display/)                            | Progress bar formatting and spinner configuration                  |
| [transfer/](transfer/)                          | Single-file & multi-file transfer engines, resume state, and the aria2c / yt-dlp bridges |
| [transfer/media-domains.ts](transfer/media-domains.ts) | The ~720-site domain list and its suffix matcher            |
| [transfer/ytdlp-transfer.ts](transfer/ytdlp-transfer.ts) | yt-dlp bridge — arg building, progress parsing, the transfer |
| [transfer/ytdlp-binary.ts](transfer/ytdlp-binary.ts) | Finding yt-dlp: env var, bundled sidecar, managed copy, `PATH` |

## Dependencies

- [`chalk`](https://github.com/chalk/chalk) — terminal colors
- [`cli-progress`](https://github.com/npkgz/cli-progress) — multi-bar progress UI
- [`cli-table3`](https://github.com/cli-table/cli-table3) — final stats table
- [`@grab-url/loading-animations`](../loading-animations) — spinner frame data
- [`aria2c`](https://aria2.github.io/) — *external binary*, only needed for SFTP, torrent and magnet transfers
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) — *external binary*, only needed for media sites; installed automatically on `npm install`

## License

MIT
