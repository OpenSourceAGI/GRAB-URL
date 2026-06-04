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
 * Options for compress().
 */
export interface CreateOptions {
    /** Files to pack: path/content pairs */
    files: Array<{
        path: string;
        content: string | Uint8Array | ArrayBuffer | Blob;
    }>;
    /** Output filename (.zip) */
    outputName: string;
    /** Compression level 1-9 (default 6) */
    compressionLevel?: number;
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
