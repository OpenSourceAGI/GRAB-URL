/**
 * @file download-format.ts
 * @description Pure formatting utility functions for the CLI downloader display.
 * All functions are stateless and take column-width constants as optional params.
 */
export declare const COL_FILENAME = 25;
export declare const COL_SPINNER = 2;
export declare const COL_BAR = 15;
export declare const COL_PERCENT = 4;
export declare const COL_DOWNLOADED = 16;
export declare const COL_TOTAL = 10;
export declare const COL_SPEED = 10;
export declare const COL_ETA = 10;
export declare const colors: {
    primary: import('chalk').ChalkInstance;
    success: import('chalk').ChalkInstance;
    warning: import('chalk').ChalkInstance;
    error: import('chalk').ChalkInstance;
    info: import('chalk').ChalkInstance;
    purple: import('chalk').ChalkInstance;
    pink: import('chalk').ChalkInstance;
    yellow: import('chalk').ChalkInstance;
    cyan: import('chalk').ChalkInstance;
    green: import('chalk').ChalkInstance;
    red: import('chalk').ChalkInstance;
    gradient: import('chalk').ChalkInstance[];
};
/**
 * Format bytes into a human-readable colored string (B / KB / MB / GB / TB).
 */
export declare function formatBytes(bytes: number, decimals?: number): string;
/**
 * Format bytes as a plain (uncolored) string.
 */
export declare function formatBytesPlain(bytes: number, decimals?: number): string;
/**
 * Compact byte formatter (no units label for MB+, whole-number KB below 100 KB).
 */
export declare function formatBytesCompact(bytes: number): string;
/**
 * Truncate a filename to `maxLength` characters, preserving extension.
 */
export declare function truncateFilename(filename: string, maxLength?: number): string;
/**
 * Format seconds as H:MM:SS, padded to COL_ETA width.
 */
export declare function formatETA(seconds: number, colEta?: number): string;
/**
 * Format total-downloaded progress for the master bar (MB/GB).
 */
export declare function formatMasterProgress(totalDownloaded: number, totalSize: number, colDownloaded?: number): string;
/**
 * Format per-file downloaded bytes for the progress column.
 */
export declare function formatProgress(downloaded: number, _total: number, colDownloaded?: number): string;
/**
 * Format total file size for display (MB/GB, 1 decimal).
 */
export declare function formatTotalDisplay(total: number, colTotal?: number): string;
/**
 * Alias for formatTotalDisplay (backward compat).
 */
export declare const formatTotal: typeof formatTotalDisplay;
/**
 * Pad a pre-formatted speed string to COL_SPEED.
 */
export declare function formatSpeed(speed: string, colSpeed?: number): string;
/**
 * Convert bytes/second to a compact display string (KB or MB, no label for MB).
 */
export declare function formatSpeedDisplay(bytesPerSecond: number): string;
/**
 * Format total aggregate speed, padded to COL_SPEED.
 */
export declare function formatTotalSpeed(bytesPerSecond: number, colSpeed?: number): string;
