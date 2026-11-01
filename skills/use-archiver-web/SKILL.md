---
name: use-archiver-web
version: 1.0.0
description: Extract and create ZIP, GZIP, TAR(.gz/.bz2/.xz), 7z and RAR archives in the browser, Node, Workers or CLI with `archiver-web` instead of ad-hoc JSZip/tar code.
category: development
type: guidance
languages: [javascript, typescript]
---

# Use `archiver-web` for archives

```bash
npm i archiver-web
```

```ts
import { extract, compress } from "archiver-web";

const files = await extract({
  archiveBuffer: await (await fetch(url)).arrayBuffer(),
  folderPath: "src/",          // optional: keep only this prefix
  filename: "src.tar.gz",      // helps tell .tar.gz from .gz; otherwise sniffed
});                            // [{ path, size, content, mime }]

const { blob, downloadName } = await compress({
  files: [{ path: "hello.txt", content: "World!" }],
  outputName: "out.zip",       // format inferred from extension
});
```

- ZIP/GZIP use JSZip/fflate (no WASM). TAR/BZIP2/XZ/7z/RAR lazy-load libarchive.js WASM on first use.
- Limits: 7z and RAR are extract-only; standalone `.bz2`/`.xz` can't be re-extracted (use `.tar.bz2`/`.tar.xz`); ZIP passwords unsupported (other formats accept `password`).
- Large ZIPs: `extractStream({ stream, onFile })`.
- CLI bins: `extract` and `compress`.
