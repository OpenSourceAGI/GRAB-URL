/**
 * Universal Archive Extractor & Creator, browser-first and lazy-loaded.
 * ZIP/GZIP go through JSZip/fflate (pure JS, no WASM). TAR, TAR.GZ, TAR.BZ2,
 * TAR.XZ, standalone BZIP2/XZ, 7z and RAR go through libarchive.js, a
 * WebAssembly build of libarchive that is only fetched once one of those
 * formats is actually used.
 * @module archiveUtils
 * @example
 * const files = await extract({ archiveBuffer: buf, folderPath: 'src/' });
 * const archiveBlob = await compress({ files: [...], outputName: 'out.zip' });
 */

import type {
  ExtractEvent,
  ExtractOptions,
  CreateOptions,
  ArchiveFile,
  ArchiveKind,
} from "./types.js";

/** CDN fallback for JSZip when it is not installed locally. */
const JSZIP_CDN_URL = "https://esm.sh/jszip@3.10.1";
/** CDN fallback for fflate (streaming unzip, gzip) when it is not installed locally. */
const FFLATE_CDN_URL = "https://esm.sh/fflate@0.8.2";
/**
 * CDN fallback for libarchive.js (TAR/BZIP2/XZ/7z/RAR) when it is not
 * installed locally. Its worker and .wasm binary are fetched relative to
 * this URL, so pin the version here and in the local optionalDependency
 * together.
 */
const LIBARCHIVE_CDN_URL =
  "https://cdn.jsdelivr.net/npm/libarchive.js@2.0.2/dist/libarchive.js";

let jsZipPromise: Promise<any> | null = null;
let fflatePromise: Promise<any> | null = null;
let libarchivePromise: Promise<any> | null = null;

/**
 * Resolve the JSZip constructor. JSZip is kept out of the bundle and loaded on
 * demand: first from a pre-loaded global, then a local install, then the CDN.
 */
function getJSZip(): Promise<any> {
  return (jsZipPromise ??= loadJSZip());
}

async function loadJSZip(): Promise<any> {
  // 1. Already available as a global (e.g. loaded via a <script> tag).
  const preloaded = (globalThis as any).JSZip;
  if (preloaded) return preloaded;

  // 2. Try a local install / bundler-resolved module.
  try {
    const mod = await import("jszip");
    return mod.default ?? mod;
  } catch {
    // Not installed locally — fall through to the CDN.
  }

  // 3. Fall back to the CDN (browsers and runtimes that support https imports).
  try {
    const mod = await import(/* @vite-ignore */ JSZIP_CDN_URL);
    return mod.default ?? mod;
  } catch (err) {
    throw new Error(
      `JSZip could not be loaded. Install it ("npm i jszip") or ensure network ` +
        `access to ${JSZIP_CDN_URL}. Cause: ${(err as Error)?.message ?? err}`,
    );
  }
}

/**
 * Resolve the fflate module. Like JSZip, it is kept out of the bundle and
 * loaded on demand: first from a local install, then the CDN. fflate is used
 * for streaming ZIP extraction and for standalone GZIP.
 */
function getFflate(): Promise<any> {
  return (fflatePromise ??= loadFflate());
}

async function loadFflate(): Promise<any> {
  // 1. Already available as a global.
  const preloaded = (globalThis as any).fflate;
  if (preloaded) return preloaded;

  // 2. Try a local install / bundler-resolved module.
  try {
    return await import("fflate");
  } catch {
    // Not installed locally — fall through to the CDN.
  }

  // 3. Fall back to the CDN.
  try {
    return await import(/* @vite-ignore */ FFLATE_CDN_URL);
  } catch (err) {
    throw new Error(
      `fflate could not be loaded. Install it ("npm i fflate") or ensure ` +
        `network access to ${FFLATE_CDN_URL}. Cause: ${(err as Error)?.message ?? err}`,
    );
  }
}

/**
 * Resolve libarchive.js (Archive/ArchiveFormat/ArchiveCompression), the
 * WebAssembly backend for every format JSZip/fflate can't handle. Loaded on
 * demand: first from a local install, then the CDN. Both `dist/libarchive.js`
 * builds resolve their worker/.wasm relative to their own module URL, so
 * loading it from a CDN also fetches its worker from that same CDN.
 */
function getLibarchive(): Promise<any> {
  return (libarchivePromise ??= loadLibarchive());
}

/**
 * libarchive.js ships two builds with the same API: a browser one (its
 * package "main", used by the bare `libarchive.js` specifier and by the CDN
 * URL) and a Node one (`libarchive.js/dist/libarchive-node.mjs`), which uses
 * `worker_threads` instead of a DOM `Worker`. There's no package "exports"
 * map to pick this automatically, so we do it ourselves.
 */
function isNodeRuntime(): boolean {
  return typeof process !== "undefined" && !!(process as any).versions?.node && typeof window === "undefined";
}

async function loadLibarchive(): Promise<any> {
  let mod: any;
  try {
    mod = isNodeRuntime()
      ? await import(/* @vite-ignore */ "libarchive.js/dist/libarchive-node.mjs")
      : await import("libarchive.js");
  } catch {
    // Not installed locally (or, in Node, not resolvable as a CDN URL) —
    // fall through to the CDN. This only actually works in environments
    // whose module loader can import() an https URL (browsers, Deno, …).
    try {
      mod = await import(/* @vite-ignore */ LIBARCHIVE_CDN_URL);
    } catch (err) {
      throw new Error(
        `libarchive.js could not be loaded. Install it ("npm i libarchive.js") or ` +
          `ensure network access to ${LIBARCHIVE_CDN_URL}. Cause: ${(err as Error)?.message ?? err}`,
      );
    }
  }
  // Don't call Archive.init() here: the Node build already self-initializes
  // (it wires up worker_threads.Worker as its getWorker) as a side effect of
  // being imported, and Archive.init() unconditionally *replaces* its options
  // object — calling it with no arguments would wipe that out. The browser
  // build already defaults to resolving its worker relative to its own
  // module URL without needing init() either.
  return mod;
}

/** Decode entry bytes as UTF-8 text, falling back to base64 for binary data. */
function decodeEntry(data: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    let binary = "";
    for (let i = 0; i < data.length; i += 0x8000) {
      binary += String.fromCharCode(...data.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }
}

async function toUint8Array(
  content: string | Uint8Array | ArrayBuffer | Blob,
): Promise<Uint8Array> {
  if (typeof content === "string") return new TextEncoder().encode(content);
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  if (content instanceof Blob) return new Uint8Array(await content.arrayBuffer());
  throw new Error("Unsupported content type");
}

/**
 * Normalize an archive entry path and reject anything that could escape the
 * extraction root (zip-slip / path traversal), e.g. `../../etc/passwd` or an
 * absolute path. Returns null for entries that should be skipped.
 */
function safeRelativePath(entryPath: string): string | null {
  const normalized = entryPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter((s) => s !== "" && s !== ".");
  if (segments.some((s) => s === "..")) return null;
  const joined = segments.join("/");
  return joined || null;
}

/**
 * Guess an archive's kind from its filename. Returns "unknown" when nothing
 * matches — callers typically fall back to ZIP for extraction (JSZip's own
 * loader will throw a clear error on non-ZIP bytes) or to ZIP for creation.
 */
export function detectArchiveKind(filename: string): ArchiveKind {
  const name = filename.toLowerCase();

  if (name.endsWith(".tar.gz") || name.endsWith(".tgz")) return "tar-gzip";
  if (name.endsWith(".tar.bz2") || name.endsWith(".tbz2") || name.endsWith(".tbz")) {
    return "tar-bzip2";
  }
  if (name.endsWith(".tar.xz") || name.endsWith(".txz")) return "tar-xz";
  if (name.endsWith(".zip")) return "zip";
  if (name.endsWith(".gz") || name.endsWith(".gzip")) return "gzip";
  if (name.endsWith(".tar")) return "tar";
  if (name.endsWith(".bz2")) return "bzip2";
  if (name.endsWith(".xz")) return "xz";
  if (name.endsWith(".7z")) return "seven-zip";
  if (name.endsWith(".rar")) return "rar";

  return "unknown";
}

/** Sniff an archive's kind from its magic bytes, for when no filename is given. */
function detectArchiveKindFromBytes(bytes: Uint8Array): ArchiveKind {
  const b = bytes;
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) {
    return "zip";
  }
  if (b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b) return "gzip";
  if (b.length >= 3 && b[0] === 0x42 && b[1] === 0x5a && b[2] === 0x68) return "bzip2";
  if (
    b.length >= 6 &&
    b[0] === 0xfd && b[1] === 0x37 && b[2] === 0x7a && b[3] === 0x58 && b[4] === 0x5a && b[5] === 0x00
  ) {
    return "xz";
  }
  if (
    b.length >= 6 &&
    b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf && b[4] === 0x27 && b[5] === 0x1c
  ) {
    return "seven-zip";
  }
  if (b.length >= 6 && b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21 && b[4] === 0x1a && b[5] === 0x07) {
    return "rar";
  }
  if (b.length >= 262) {
    const magic = String.fromCharCode(...b.subarray(257, 262));
    if (magic === "ustar") return "tar";
  }
  return "unknown";
}

function resolveExtractKind(
  bytes: Uint8Array,
  filename: string | undefined,
  format: ArchiveKind | undefined,
): ArchiveKind {
  if (format) return format;
  if (filename) {
    const byName = detectArchiveKind(filename);
    if (byName !== "unknown") return byName;
  }
  return detectArchiveKindFromBytes(bytes);
}

function defaultFilenameForKind(kind: ArchiveKind): string {
  switch (kind) {
    case "tar": return "archive.tar";
    case "tar-gzip": return "archive.tar.gz";
    case "tar-bzip2": return "archive.tar.bz2";
    case "tar-xz": return "archive.tar.xz";
    case "bzip2": return "archive.bz2";
    case "xz": return "archive.xz";
    case "seven-zip": return "archive.7z";
    case "rar": return "archive.rar";
    default: return "archive.bin";
  }
}

/**
 * Stream-extract files from a ZIP as the bytes arrive, without buffering the
 * whole archive first. Each completed entry is passed to `onFile` immediately,
 * so consumers can begin processing files before the download finishes.
 *
 * ZIP only — for other formats, buffer the response and use `extract()`.
 * @param options - Stream extract configuration
 * @param options.stream - ReadableStream of the ZIP archive bytes
 * @param options.folderPath - Folder to extract (e.g., 'src/'), empty=root
 * @param options.onFile - Called with each entry as soon as it is extracted
 * @returns Array of all extracted files (resolved once the stream ends)
 */
export async function extractStream(options: {
  stream: ReadableStream<Uint8Array>;
  folderPath?: string;
  onFile?: (file: ExtractEvent) => void;
}): Promise<ExtractEvent[]> {
  const { stream, folderPath = "", onFile } = options;

  if (!stream) {
    throw new Error("Must provide stream");
  }

  const { Unzip, UnzipInflate } = await getFflate();
  const files: ExtractEvent[] = [];

  await new Promise<void>((resolve, reject) => {
    const unzip = new Unzip();
    unzip.register(UnzipInflate);

    let streamDone = false;
    let pending = 0;
    const maybeResolve = () => {
      if (streamDone && pending === 0) resolve();
    };

    unzip.onfile = (file: any) => {
      const name: string = file.name;
      const inFolder = !folderPath || name.startsWith(folderPath);
      const strippedPath = folderPath
        ? name.slice(folderPath.length).replace(/^\//, "")
        : name;
      const safePath = strippedPath ? safeRelativePath(strippedPath) : null;

      // Skip directories, entries outside the requested folder, and unsafe
      // (path-traversal) entries, but still drain them so the stream parser
      // can advance to later entries.
      if (!inFolder || !safePath || name.endsWith("/")) {
        file.ondata = () => {};
        file.start();
        return;
      }

      const chunks: Uint8Array[] = [];
      pending++;
      file.ondata = (err: Error | null, chunk: Uint8Array, final: boolean) => {
        if (err) return reject(err);
        if (chunk) chunks.push(chunk);
        if (!final) return;

        const size = chunks.reduce((n, c) => n + c.length, 0);
        const data = new Uint8Array(size);
        let offset = 0;
        for (const c of chunks) {
          data.set(c, offset);
          offset += c.length;
        }

        const event: ExtractEvent = {
          path: safePath,
          size,
          content: decodeEntry(data),
          mime: "application/octet-stream",
        };
        files.push(event);
        onFile?.(event);
        pending--;
        maybeResolve();
      };
      file.start();
    };

    const reader = stream.getReader();
    const pump = (): Promise<void> =>
      reader.read().then(({ done, value }) => {
        if (done) {
          unzip.push(new Uint8Array(0), true);
          streamDone = true;
          maybeResolve();
          return;
        }
        unzip.push(value, false);
        return pump();
      });
    pump().catch(reject);
  });

  return files;
}

/** Extract a ZIP ArrayBuffer via JSZip. */
async function extractZip(
  archiveBuffer: ArrayBuffer,
  folderPath: string,
  password: string | undefined,
): Promise<ExtractEvent[]> {
  if (password) {
    throw new Error("Password-protected archives are not supported");
  }

  const JSZip = await getJSZip();
  const zip = await JSZip.loadAsync(archiveBuffer);
  const files: ExtractEvent[] = [];

  for (const [relativePath, zipEntry] of Object.entries<any>(zip.files)) {
    if (zipEntry.dir) continue;

    if (folderPath && !relativePath.startsWith(folderPath)) continue;

    const strippedPath = folderPath
      ? relativePath.slice(folderPath.length).replace(/^\//, "")
      : relativePath;

    if (!strippedPath) continue;

    const safePath = safeRelativePath(strippedPath);
    if (!safePath) continue;

    let content: string;
    const data = await zipEntry.async("uint8array");
    const size = data.byteLength;

    try {
      content = await zipEntry.async("text");
    } catch {
      content = btoa(String.fromCharCode(...data));
    }

    files.push({ path: safePath, size, content, mime: "application/octet-stream" });
  }

  return files;
}

/** Decompress a standalone GZIP stream (a single file, not a container format). */
async function extractGzip(bytes: Uint8Array, filename: string | undefined): Promise<ExtractEvent[]> {
  const fflate = await getFflate();
  const data: Uint8Array = fflate.gunzipSync(bytes);
  const base = filename?.replace(/\.(gz|gzip)$/i, "") || "file";
  const safePath = safeRelativePath(base) ?? "file";
  return [{ path: safePath, size: data.byteLength, content: decodeEntry(data), mime: "application/octet-stream" }];
}

/** Recursively flatten libarchive.js's nested folder-tree result into ExtractEvent[]. */
async function collectLibarchiveFiles(node: any, prefix: string, out: ExtractEvent[]): Promise<void> {
  for (const [key, value] of Object.entries(node)) {
    const safeKey = safeRelativePath(key);
    if (safeKey === null) continue;
    const entryPath = prefix ? `${prefix}/${safeKey}` : safeKey;

    if (value instanceof File) {
      const data = new Uint8Array(await value.arrayBuffer());
      out.push({
        path: entryPath,
        size: data.byteLength,
        content: decodeEntry(data),
        mime: "application/octet-stream",
      });
    } else if (value && typeof value === "object") {
      await collectLibarchiveFiles(value, entryPath, out);
    }
  }
}

/** Extract TAR/TAR.GZ/TAR.BZ2/TAR.XZ/BZIP2/XZ/7z/RAR via the libarchive.js WASM backend. */
async function extractWithLibarchive(
  bytes: Uint8Array,
  kind: ArchiveKind,
  folderPath: string,
  filename: string | undefined,
  password: string | undefined,
): Promise<ExtractEvent[]> {
  const { Archive } = await getLibarchive();
  const file = new File([bytes as BlobPart], filename ?? defaultFilenameForKind(kind));
  const archive = await Archive.open(file);

  if (password && (await archive.hasEncryptedData())) {
    await archive.usePassword(password);
  }

  const tree = await archive.extractFiles();
  const all: ExtractEvent[] = [];
  await collectLibarchiveFiles(tree, "", all);

  if (!folderPath) return all;

  const results: ExtractEvent[] = [];
  for (const entry of all) {
    if (!entry.path.startsWith(folderPath)) continue;
    const stripped = entry.path.slice(folderPath.length).replace(/^\//, "");
    if (!stripped) continue;
    results.push({ ...entry, path: stripped });
  }
  return results;
}

/**
 * Extract files from an archive's ArrayBuffer. Supports ZIP and GZIP without
 * any WASM (via JSZip/fflate); TAR, TAR.GZ, TAR.BZ2, TAR.XZ, 7z and RAR are
 * handled by a lazily-loaded libarchive.js (WASM) backend, fetched only when
 * one of those formats is actually used. Standalone BZIP2/XZ (not inside a
 * TAR) can be created but not read back — see `compress()`.
 *
 * The kind is picked, in order, from `options.format`, then from
 * `options.filename`'s extension, then by sniffing the archive's magic bytes.
 * @param options - Extract configuration
 * @param options.archiveBuffer - The archive to extract (ArrayBuffer)
 * @param options.folderPath - Folder to extract (e.g., 'src/'), empty=root
 * @param options.password - Optional password (only decryptable via libarchive.js; throws for ZIP)
 * @param options.filename - Original filename, used to pick a codec
 * @param options.format - Force a specific archive kind instead of auto-detecting
 * @returns Array of extracted files
 */
export async function extract(options: ExtractOptions): Promise<ExtractEvent[]> {
  const { archiveBuffer, folderPath = "", password, filename, format } = options;

  if (!archiveBuffer) {
    throw new Error("Must provide archiveBuffer");
  }

  const bytes = new Uint8Array(archiveBuffer);
  const kind = resolveExtractKind(bytes, filename, format);

  switch (kind) {
    case "gzip":
      return extractGzip(bytes, filename);
    case "bzip2":
    case "xz":
      // libarchive.js 2.0.2's reader can't decode a standalone BZIP2/XZ
      // stream (its "raw" format support isn't wired up) even though it can
      // both write one and read one inside a TAR. Fail loudly rather than
      // silently returning zero files.
      throw new Error(
        `Reading a standalone .${kind === "bzip2" ? "bz2" : "xz"} file is not supported ` +
          `(libarchive.js can't decode it outside a TAR container). Use tar-${kind} (.tar.${kind === "bzip2" ? "bz2" : "xz"}) instead.`,
      );
    case "tar":
    case "tar-gzip":
    case "tar-bzip2":
    case "tar-xz":
    case "seven-zip":
    case "rar":
      return extractWithLibarchive(bytes, kind, folderPath, filename, password);
    default:
      return extractZip(archiveBuffer, folderPath, password);
  }
}

/** Create a ZIP archive via JSZip. */
async function compressZip(
  files: CreateOptions["files"],
  outputName: string,
  compressionLevel: number,
): Promise<ArchiveFile> {
  const JSZip = await getJSZip();
  const zip = new JSZip();

  for (const { path, content } of files) {
    let data: string | Uint8Array | ArrayBuffer | Blob;
    if (typeof content === "string") {
      data = content;
    } else if (content instanceof Uint8Array) {
      data = content;
    } else if (content instanceof ArrayBuffer) {
      data = new Uint8Array(content);
    } else if (content instanceof Blob) {
      data = await content.arrayBuffer().then((b) => new Uint8Array(b));
    } else {
      throw new Error(`Unsupported content type for ${path}`);
    }
    zip.file(path, data);
  }

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: compressionLevel },
  });

  return { blob, mime: "application/zip", downloadName: outputName };
}

/** Compress a single file into a standalone .gz stream (not a multi-file container). */
async function compressGzip(
  files: CreateOptions["files"],
  outputName: string,
  compressionLevel: number,
): Promise<ArchiveFile> {
  if (files.length !== 1) {
    throw new Error(
      "A .gz output holds exactly one compressed file; archive multiple files as tar-gzip (.tar.gz) instead.",
    );
  }

  const fflate = await getFflate();
  const bytes = await toUint8Array(files[0].content);
  const level = Math.min(9, Math.max(0, compressionLevel));
  const compressed: Uint8Array = fflate.gzipSync(bytes, { level });

  return {
    blob: new Blob([compressed as BlobPart], { type: "application/gzip" }),
    mime: "application/gzip",
    downloadName: outputName,
  };
}

/** Compress a single file into a standalone BZIP2/XZ stream via libarchive.js's RAW format. */
async function compressRawStream(
  files: CreateOptions["files"],
  outputName: string,
  kind: "bzip2" | "xz",
): Promise<ArchiveFile> {
  if (files.length !== 1) {
    const ext = kind === "bzip2" ? "bz2" : "xz";
    throw new Error(
      `A .${ext} output holds exactly one compressed file; wrap multiple files in a tar first (tar-${kind}).`,
    );
  }

  const { Archive, ArchiveFormat, ArchiveCompression } = await getLibarchive();
  const { path, content } = files[0];
  const name = path.split("/").pop() || path;

  const archiveFile: File = await Archive.write({
    files: [{ file: new File([content as BlobPart], name) }],
    outputFileName: outputName,
    compression: kind === "bzip2" ? ArchiveCompression.BZIP2 : ArchiveCompression.XZ,
    format: ArchiveFormat.RAW,
  });

  return { blob: archiveFile, mime: "application/octet-stream", downloadName: outputName };
}

/** Create a TAR/TAR.GZ/TAR.BZ2/TAR.XZ archive via the libarchive.js WASM backend. */
async function compressWithLibarchive(
  files: CreateOptions["files"],
  outputName: string,
  kind: "tar" | "tar-gzip" | "tar-bzip2" | "tar-xz",
): Promise<ArchiveFile> {
  const { Archive, ArchiveFormat, ArchiveCompression } = await getLibarchive();

  const target = {
    format: ArchiveFormat.USTAR,
    // libarchive.js 2.0.2 fails to write an uncompressed (NONE) USTAR
    // archive ("written bytes don't match file size", reproducible with any
    // input). GZIP works reliably, so for a plain .tar we write a .tar.gz
    // instead and gunzip it ourselves below.
    compression:
      kind === "tar-bzip2"
        ? ArchiveCompression.BZIP2
        : kind === "tar-xz"
          ? ArchiveCompression.XZ
          : ArchiveCompression.GZIP,
  };

  const entryFiles = files.map(({ path, content }) => ({
    file: new File([content as BlobPart], path.split("/").pop() || path),
    pathname: path,
  }));

  const archiveFile: File = await Archive.write({
    files: entryFiles,
    outputFileName: kind === "tar" ? `${outputName}.gz` : outputName,
    compression: target.compression,
    format: target.format,
  });

  if (kind !== "tar") {
    return { blob: archiveFile, mime: "application/octet-stream", downloadName: outputName };
  }

  const fflate = await getFflate();
  const gzBytes = new Uint8Array(await archiveFile.arrayBuffer());
  const tarBytes: Uint8Array = fflate.gunzipSync(gzBytes);
  return {
    blob: new Blob([tarBytes as BlobPart], { type: "application/x-tar" }),
    mime: "application/x-tar",
    downloadName: outputName,
  };
}

/**
 * Create an archive from a files array. Supports ZIP and standalone GZIP
 * without any WASM (via JSZip/fflate); TAR, TAR.GZ, TAR.BZ2, TAR.XZ and
 * standalone BZIP2/XZ are created by a lazily-loaded libarchive.js (WASM)
 * backend. RAR and 7z are extraction-only (RAR is proprietary; libarchive.js
 * 2.0.2 can't write a spec-compliant .7z). A standalone BZIP2/XZ output is
 * valid and readable by other tools, but this package's own `extract()`
 * can't currently read it back — use tar-bzip2/tar-xz for round-trips
 * within archiver-web.
 *
 * The kind is picked from `options.format`, or inferred from `outputName`'s
 * extension (defaulting to ZIP when neither says anything specific).
 * @param options - Create configuration
 * @param options.files - Array of {path, content} pairs
 * @param options.outputName - Archive filename (e.g., 'out.zip', 'out.tar.gz')
 * @param options.compressionLevel - 1-9 (defaults 6). Only applies to zip/gzip.
 * @param options.format - Force a specific archive kind instead of inferring one
 * @returns Blob of archive
 */
export async function compress(options: CreateOptions): Promise<ArchiveFile> {
  const { files, outputName, compressionLevel = 6, format } = options;
  const detected = format ?? detectArchiveKind(outputName);
  const kind: ArchiveKind = detected === "unknown" ? "zip" : detected;

  switch (kind) {
    case "rar":
      throw new Error(
        "RAR archive creation is not supported (RAR is a proprietary format; only extraction is possible).",
      );
    case "seven-zip":
      throw new Error(
        "7z archive creation is not supported (libarchive.js 2.0.2 doesn't write a spec-compliant .7z " +
          "container). 7z extraction is still supported.",
      );
    case "gzip":
      return compressGzip(files, outputName, compressionLevel);
    case "bzip2":
    case "xz":
      return compressRawStream(files, outputName, kind);
    case "tar":
    case "tar-gzip":
    case "tar-bzip2":
    case "tar-xz":
      return compressWithLibarchive(files, outputName, kind);
    default:
      return compressZip(files, outputName, compressionLevel);
  }
}

export type { ExtractEvent, ExtractOptions, CreateOptions, ArchiveFile, ArchiveKind };
