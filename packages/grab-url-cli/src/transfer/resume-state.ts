/**
 * @file download-state.ts
 * @description Resume-state persistence and server capability probing for the CLI downloader.
 * All functions are pure/stateless — they accept explicit paths and signal references.
 */

import fs from 'fs';
import path from 'path';
import { colors } from '../display/progress-format.js';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── State-directory helpers ──────────────────────────────────────────────────

/**
 * Resolve the download state directory from env or default location.
 */
export function getStateDirectory(): string {
    return process.env.GRAB_DOWNLOAD_STATE_DIR || path.join(process.cwd(), '.grab-downloads');
}

/**
 * Ensure the state directory exists, creating it if necessary.
 * Returns the resolved directory path (may fall back to cwd on error).
 */
export function ensureStateDirectory(stateDir: string): string {
    try {
        if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
        return stateDir;
    } catch {
        console.log(colors.warning('⚠️  Could not create state directory, using current directory'));
        return process.cwd();
    }
}

/**
 * Return the `.download-state` sidecar path for a given output file.
 */
export function getStateFilePath(stateDir: string, outputPath: string): string {
    return path.join(stateDir, path.basename(outputPath) + '.download-state');
}

/**
 * Delete a state sidecar file if it exists.
 */
export function cleanupStateFile(stateFilePath: string): void {
    try { if (fs.existsSync(stateFilePath)) fs.unlinkSync(stateFilePath); } catch { }
}

/**
 * Read and parse a saved download state (returns null on any failure).
 */
export function loadDownloadState(stateFilePath: string): DownloadState | null {
    try {
        if (fs.existsSync(stateFilePath))
            return JSON.parse(fs.readFileSync(stateFilePath, 'utf8')) as DownloadState;
    } catch { }
    return null;
}

/**
 * Persist download state to a JSON sidecar file.
 */
export function saveDownloadState(stateFilePath: string, state: DownloadState): void {
    try { fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2)); } catch { }
}

/**
 * Return the byte count of an existing partial (`.tmp`) file, or 0.
 */
export function getPartialFileSize(filePath: string): number {
    try { if (fs.existsSync(filePath)) return fs.statSync(filePath).size; } catch { }
    return 0;
}

// ─── Server support ───────────────────────────────────────────────────────────

/**
 * Issue a HEAD request to discover whether the server supports range-based
 * resumable downloads and what the remote file size is.
 */
export async function checkServerSupport(
    url: string,
    signal?: AbortSignal | null,
): Promise<ServerInfo> {
    try {
        const res = await fetch(url, { method: 'HEAD', ...(signal ? { signal } : {}) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return {
            supportsResume: res.headers.get('accept-ranges') === 'bytes',
            totalSize: parseInt(res.headers.get('content-length') ?? '0', 10) || 0,
            lastModified: res.headers.get('last-modified'),
            etag: res.headers.get('etag'),
            headers: res.headers,
        };
    } catch {
        console.log(colors.warning('⚠️  Could not check server resume support'));
        return { supportsResume: false, totalSize: 0, lastModified: null, etag: null, headers: null };
    }
}

// ─── Resume-decision helper ───────────────────────────────────────────────────

/**
 * Given server info and the local partial file, decide whether to resume or
 * start fresh.  Cleans up stale temp/state files as a side-effect when
 * resuming is not possible.
 */
export function resolveResumeDecision(
    serverInfo: ServerInfo,
    previousState: DownloadState | null,
    partialSize: number,
    tempFilePath: string,
    stateFilePath: string,
): ResumeDecision {
    if (serverInfo.supportsResume && partialSize > 0 && previousState) {
        const unchanged =
            (!serverInfo.lastModified || serverInfo.lastModified === previousState.lastModified) &&
            (!serverInfo.etag || serverInfo.etag === previousState.etag) &&
            serverInfo.totalSize === previousState.totalSize;

        if (unchanged && partialSize < serverInfo.totalSize) {
            return { startByte: partialSize, resuming: true };
        }
        // File changed — discard partial
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        cleanupStateFile(stateFilePath);
    } else if (partialSize > 0) {
        // No resume support — discard partial
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    }
    return { startByte: 0, resuming: false };
}
