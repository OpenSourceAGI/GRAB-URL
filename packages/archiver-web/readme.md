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

# Web Universal Archive Extractor and Creator

Universal archive **extractor and creator** for the web. TypeScript, frontend-friendly, uses [JSZip](https://stuk.github.io/jszip/) under the hood and runs in Node.js, the browser, Cloudflare Workers, and the CLI.

```bash
npm i archiver-web
```

## Quick Start

**Extract a folder out of a remote archive:**

```ts
import { extractFolder } from "archiver-web";

const files = await extractFolder({
  archiveUrl: "https://github.com/user/repo/archive/main.zip",
  folderPath: "src/",
});
// [{ path: 'main.ts', size: 2048, content: '...', mime: 'text/typescript' }]
```

**Create an archive from in-memory files:**

```ts
import { createArchive, ArchiveCompression, ArchiveFormat } from "archiver-web";

const archive = await createArchive({
  files: [{ path: "hello.txt", content: "World!" }],
  outputName: "out.tar.gz",
  compression: ArchiveCompression.GZIP,
});
```

## Format Comparison

| Format      | Compression | Speed      | Size       | % Reduction (10MB) | Use Case         |
| ----------- | ----------- | ---------- | ---------- | ------------------ | ---------------- |
| **ZIP**     | Deflate 1-9 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | **79%**            | Web/distribution |
| **7z**      | LZMA 1-9    | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | **88%**            | Max compression  |
| **TAR.GZ**  | GZIP 1-9    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     | **72%**            | Linux/fast       |
| **TAR.BZ2** | BZIP2 1-9   | ⭐⭐       | ⭐⭐⭐⭐   | **82%**            | Medium Unix      |
| **TAR**     | None        | ⭐⭐⭐⭐⭐ | ⭐         | **0%**             | Bundling         |

## API

```ts
// Extract a folder (or single file path) out of a remote archive
extractFolder({
  archiveUrl: string,
  folderPath?: string,
  password?: string,
});

// Create an archive from a list of files
createArchive({
  files: Array<{ path: string; content: string | Uint8Array | Blob }>,
  outputName: string,
  format?: ArchiveFormat,
  compression?: ArchiveCompression,
  compressionLevel?: 1 | 3 | 6 | 9, // 1 = fastest, 9 = best
});
```

## Usage Recipes

```ts
// Extract just the React `packages/react` source from upstream
const reactSrc = await extractFolder({
  archiveUrl: "https://github.com/facebook/react/archive/main.zip",
  folderPath: "react-*/packages/react",
});

// Repackage it as 7z at max compression
const tiny7z = await createArchive({
  files: reactSrc,
  outputName: "react.7z",
  compression: ArchiveCompression.LZMA,
  compressionLevel: 9, // ~88% reduction
});
```

## CLI

The package exposes two bins for one-off use:

```bash
npx extract <archiveUrl> [folderPath]
npx compress <inputDir> <outputName>
```

## Development

```bash
bun install
bun run build     # vite build
bun test          # tsx test.ts
```

## License

MIT
