import { ExtractEvent, CreateOptions, ArchiveFile } from './types.js';
/**
 * Extract files from a ZIP ArrayBuffer.
 * @param options - Extract configuration
 * @param options.archiveBuffer - The archive to extract (ArrayBuffer)
 * @param options.folderPath - Folder to extract (e.g., 'src/'), empty=root
 * @param options.password - Optional password (not supported by JSZip - throws if provided)
 * @returns Array of extracted files
 */
export declare function extract(options: {
    archiveBuffer: ArrayBuffer;
    folderPath?: string;
    password?: string;
}): Promise<ExtractEvent[]>;
/**
 * Create a ZIP archive from files array.
 * @param options - Create configuration
 * @param options.files - Array of {path, content} pairs
 * @param options.outputName - Archive filename (e.g., 'out.zip')
 * @param options.compressionLevel - 1-9 (defaults 6)
 * @returns Blob of archive
 */
export declare function compress(options: CreateOptions): Promise<ArchiveFile>;
export type { ExtractEvent, CreateOptions, ArchiveFile };
