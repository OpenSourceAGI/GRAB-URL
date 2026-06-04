/**
 * @file download-state.ts
 * @description Resume-state persistence and server capability probing for the CLI downloader.
 * All functions are pure/stateless — they accept explicit paths and signal references.
 */
export interface ServerInfo {
    supportsResume: boolean;
    totalSize: number;
    lastModified: string | null;
    etag: string | null;
    headers: Headers | null;
}
export interface DownloadState {
    url: string;
    outputPath: string;
    totalSize: number;
    startByte: number;
    lastModified: string | null;
    etag: string | null;
    timestamp: string;
}
export interface ResumeDecision {
    startByte: number;
    resuming: boolean;
}
/**
 * Resolve the download state directory from env or default location.
 */
export declare function getStateDirectory(): string;
/**
 * Ensure the state directory exists, creating it if necessary.
 * Returns the resolved directory path (may fall back to cwd on error).
 */
export declare function ensureStateDirectory(stateDir: string): string;
/**
 * Return the `.download-state` sidecar path for a given output file.
 */
export declare function getStateFilePath(stateDir: string, outputPath: string): string;
/**
 * Delete a state sidecar file if it exists.
 */
export declare function cleanupStateFile(stateFilePath: string): void;
/**
 * Read and parse a saved download state (returns null on any failure).
 */
export declare function loadDownloadState(stateFilePath: string): DownloadState | null;
/**
 * Persist download state to a JSON sidecar file.
 */
export declare function saveDownloadState(stateFilePath: string, state: DownloadState): void;
/**
 * Return the byte count of an existing partial (`.tmp`) file, or 0.
 */
export declare function getPartialFileSize(filePath: string): number;
/**
 * Issue a HEAD request to discover whether the server supports range-based
 * resumable downloads and what the remote file size is.
 */
export declare function checkServerSupport(url: string, signal?: AbortSignal | null): Promise<ServerInfo>;
/**
 * Given server info and the local partial file, decide whether to resume or
 * start fresh.  Cleans up stale temp/state files as a side-effect when
 * resuming is not possible.
 */
export declare function resolveResumeDecision(serverInfo: ServerInfo, previousState: DownloadState | null, partialSize: number, tempFilePath: string, stateFilePath: string): ResumeDecision;
