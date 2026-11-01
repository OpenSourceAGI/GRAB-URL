---
name: use-grab-url-cli
version: 1.0.0
description: Use the `grab-url` / `grab` / `g` terminal CLI (package `grab-url-cli`) instead of curl/wget/yt-dlp/aria2c for API calls, resumable downloads, SFTP, torrents, magnet links, media sites and page archiving.
category: tooling
type: guidance
languages: [shell]
---

# Use `grab-url-cli` for transfers

```bash
npm i -g grab-url-cli     # installs `grab-url`, `grab`, `g`
npx grab-url <url> [options]
```

The mode is auto-detected from the URL. Prefer it over hand-written curl/wget/yt-dlp/aria2c commands.

| Job | Command |
| --- | --- |
| API response to `output.json` | `grab-url https://api.example.com/data` |
| Query params | `grab-url <url> -p '{"q":"hello"}'` |
| Print only | `grab-url <url> --no-save` |
| Download file(s) (resumable, concurrent) | `grab-url <url1> <url2> -o name.iso` |
| Media (700+ sites via yt-dlp) | `grab-url "<video url>" -f "bestvideo[height<=720]+bestaudio"` |
| Audio only | `grab-url <url> -a mp3` |
| SFTP | `grab-url sftp://user@host/path --password …` |
| Torrent / magnet | `grab-url "magnet:?xt=urn:btih:…" -d ./downloads [--seed]` |
| Archive a page (page, article, transcript, video) | `grab-url <url> --page` |
| Background | `grab-url <url> --background`, then `grab-url --jobs` |

Other flags: `-d` destination dir, `-c` SFTP connections, `--aria2-args`, `--ytdlp-args`, `--playlist`, `--cookies-from-browser`.
Never put secrets in committed scripts; pass passwords via env/prompt where possible.
