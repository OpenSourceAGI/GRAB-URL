<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://grab.js.org"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/GRAB-URL/tree/master/packages/archiver-web"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/archiver-web"><img src="https://img.shields.io/npm/dm/archiver-web.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/archiver-web"><img src="https://img.shields.io/npm/v/archiver-web.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/archiver-web"><img src="https://img.shields.io/npm/dt/archiver-web.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/archiver-web"><img src="https://img.shields.io/npm/types/archiver-web" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=archiver-web"><img src="https://packagephobia.com/badge?p=archiver-web" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/GRAB-URL" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/GRAB-URL?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/GRAB-URL?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/GRAB-URL?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/GRAB-URL" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/GRAB-URL.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" alt="npm" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" />
</p>
<!-- template-git-repo:badges:end -->

# archiver-web

Universal archive **extractor and creator** for the web. TypeScript, frontend-friendly, uses [JSZip](https://stuk.github.io/jszip/) under the hood and runs in Node.js, the browser, Cloudflare Workers, and the CLI.

```bash
npm i archiver-web
```

## Quick Start

**Extract a folder out of an archive:**

```ts
import { extract } from "archiver-web";

const response = await fetch("https://github.com/user/repo/archive/main.zip");

const files = await extract({
  archiveBuffer: await response.arrayBuffer(),
  folderPath: "src/",
});
// [{ path: 'main.ts', size: 2048, content: '...', mime: 'application/octet-stream' }]
```

**Create an archive from in-memory files:**

```ts
import { compress } from "archiver-web";

const archive = await compress({
  files: [{ path: "hello.txt", content: "World!" }],
  outputName: "out.zip",
});
// { blob, mime: 'application/zip', downloadName: 'out.zip' }
```

## Format

ZIP only, with DEFLATE at levels 1-9 (default 6) — JSZip is the whole engine, so
there is no 7z, TAR or BZIP2 here, and password-protected archives throw.

## API

```ts
// Read an archive's bytes. folderPath keeps only entries under that prefix and
// strips it from the returned paths.
extract({
  archiveBuffer: ArrayBuffer,
  folderPath?: string,
  password?: string,   // throws — JSZip cannot decrypt
}): Promise<Array<{ path: string; size: number; content: string; mime: string }>>

// The same, incrementally: onFile fires per entry instead of buffering them all.
extractStream({
  stream: ReadableStream,
  onFile?: (file: { path: string; size: number; content: string }) => void,
}): Promise<void>

// Create a ZIP from a list of files
compress({
  files: Array<{ path: string; content: string | Uint8Array | ArrayBuffer | Blob }>,
  outputName: string,
  compressionLevel?: 1 | 3 | 6 | 9,   // 1 = fastest, 9 = best
}): Promise<{ blob: Blob; mime: string; downloadName: string }>
```

## Usage Recipes

```ts
// Pull just one folder out of a repo tarball
const response = await fetch("https://github.com/facebook/react/archive/main.zip");

const reactSrc = await extract({
  archiveBuffer: await response.arrayBuffer(),
  folderPath: "react-main/packages/react/",
});

// Repackage it at max compression
const repacked = await compress({
  files: reactSrc,
  outputName: "react.zip",
  compressionLevel: 9,
});
```

## CLI

The package exposes two bins for one-off use. Both read stdin when no file is
given, and write to stdout when no output is given:

```bash
npx extract <archive.zip> -o <out-dir> [-d <folder-in-archive>]
npx compress <files...> -o <out.zip> [-l <1-9>]
```

## Development

```bash
bun install
bun run build     # vite build
bun test          # tsx test.ts
```

## License

MIT
