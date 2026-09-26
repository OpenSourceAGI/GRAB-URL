/**
 * Extracted file info.
 */
export interface ExtractEvent {
  /** Relative path */
  path: string;
  /** Size in bytes */
  size: number;
  /** Content (text or base64 binary) */
  content: string;
  /** MIME type */
  mime: string;
}

/**
 * Archive container/compression kinds recognized by `extract`/`compress`.
 * `zip` and `gzip` are handled without WASM (JSZip / fflate); every other
 * kind is handled by a lazily-loaded libarchive.js (WebAssembly) backend.
 */
export type ArchiveKind =
  | "zip"
  | "gzip"
  | "tar"
  | "tar-gzip"
  | "tar-bzip2"
  | "tar-xz"
  | "bzip2"
  | "xz"
  | "seven-zip"
  | "rar"
  | "unknown";

/**
 * Options for extract().
 */
export interface ExtractOptions {
  /** The archive to extract */
  archiveBuffer: ArrayBuffer;
  /** Folder to extract (e.g., 'src/'), empty=root */
  folderPath?: string;
  /** Password for encrypted archives (only supported via the libarchive.js backend) */
  password?: string;
  /** Original filename; used to pick a codec and to tell e.g. `.tar.gz` from `.gz` apart */
  filename?: string;
  /** Force a specific archive kind instead of auto-detecting from filename/magic bytes */
  format?: ArchiveKind;
}

/**
 * Options for compress().
 */
export interface CreateOptions {
  /** Files to pack: path/content pairs */
  files: Array<{
    path: string;
    content: string | Uint8Array | ArrayBuffer | Blob;
  }>;
  /** Output filename (e.g. 'out.zip', 'out.tar.gz') */
  outputName: string;
  /** Compression level 1-9 (default 6). Only applies to the zip/gzip backends. */
  compressionLevel?: number;
  /** Force a specific archive kind instead of inferring one from outputName's extension */
  format?: ArchiveKind;
}

/**
 * Created archive result.
 */
export interface ArchiveFile {
  /** Archive Blob */
  blob: Blob;
  /** MIME for response */
  mime: string;
  /** Suggested download name */
  downloadName: string;
}
