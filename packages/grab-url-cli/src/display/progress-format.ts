/**
 * @file download-format.ts
 * @description Pure formatting utility functions for the CLI downloader display.
 * All functions are stateless and take column-width constants as optional params.
 */

import path from 'path';
import chalk from 'chalk';

// Default column widths (match MultiColorFileDownloaderCLI defaults)
export const COL_FILENAME = 25;
export const COL_SPINNER = 2;
export const COL_BAR = 15;
export const COL_PERCENT = 4;
export const COL_DOWNLOADED = 16;
export const COL_TOTAL = 10;
export const COL_SPEED = 10;
export const COL_ETA = 10;

// Color palette
export const colors = {
    primary: chalk.cyan,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    info: chalk.blue,
    purple: chalk.magenta,
    pink: chalk.magentaBright,
    yellow: chalk.yellowBright,
    cyan: chalk.cyanBright,
    green: chalk.green,
    red: chalk.red,
    gradient: [chalk.blue, chalk.magenta, chalk.cyan, chalk.green, chalk.yellow, chalk.red],
};

/**
 * Format bytes into a human-readable colored string (B / KB / MB / GB / TB).
 */
export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return colors.info('0 B');
    const k = 1024;
    const dm = Math.max(decimals, 0);
    const sizes = [
        { unit: 'B', color: colors.info },
        { unit: 'KB', color: colors.cyan },
        { unit: 'MB', color: colors.yellow },
        { unit: 'GB', color: colors.purple },
        { unit: 'TB', color: colors.pink },
        { unit: 'PB', color: colors.primary },
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    const size = sizes[i] ?? sizes[sizes.length - 1];
    return size.color.bold(`${value} ${size.unit}`);
}

/**
 * Format bytes as a plain (uncolored) string.
 */
export function formatBytesPlain(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = Math.max(decimals, 0);
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    return `${value} ${sizes[i] ?? sizes[sizes.length - 1]}`;
}

/**
 * Compact byte formatter (no units label for MB+, whole-number KB below 100 KB).
 */
export function formatBytesCompact(bytes: number): string {
    if (bytes === 0) return '0B';
    const k = 1024;
    const kb = bytes / k;
    if (kb < 100) return `${Math.round(kb)}KB`;
    return `${(bytes / (k * k)).toFixed(1)}`;
}

/**
 * Truncate a filename to `maxLength` characters, preserving extension.
 */
export function truncateFilename(filename: string, maxLength = COL_FILENAME): string {
    if (filename.length <= maxLength) return filename.padEnd(maxLength);
    const extension = path.extname(filename);
    const baseName = path.basename(filename, extension);
    if (baseName.length <= 3) return filename.padEnd(maxLength);
    const firstPart = Math.ceil((maxLength - extension.length - 3) / 2);
    const lastPart = Math.floor((maxLength - extension.length - 3) / 2);
    const truncatedBase = baseName.slice(0, firstPart) + '...' + baseName.slice(-lastPart);
    return `${truncatedBase}${extension}`.padEnd(maxLength);
}

/**
 * Format seconds as H:MM:SS, padded to COL_ETA width.
 */
export function formatETA(seconds: number, colEta = COL_ETA): string {
    if (!seconds || !isFinite(seconds) || seconds < 0) return '   --   ';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`.padEnd(colEta);
}

/**
 * Format total-downloaded progress for the master bar (MB/GB).
 */
export function formatMasterProgress(
    totalDownloaded: number,
    totalSize: number,
    colDownloaded = COL_DOWNLOADED,
): string {
    const k = 1024;
    const mb = totalDownloaded / (k * k);
    const totalMb = totalSize / (k * k);
    if (totalMb >= 1024) return `${(mb / 1024).toFixed(1)}GB`.padEnd(colDownloaded);
    return `${mb.toFixed(1)}MB`.padEnd(colDownloaded);
}

/**
 * Format per-file downloaded bytes for the progress column.
 */
export function formatProgress(downloaded: number, _total: number, colDownloaded = COL_DOWNLOADED): string {
    return formatBytesCompact(downloaded).padEnd(colDownloaded);
}

/**
 * Format total file size for display (MB/GB, 1 decimal).
 */
export function formatTotalDisplay(total: number, colTotal = COL_TOTAL): string {
    if (total === 0) return '0MB'.padEnd(colTotal);
    const k = 1024;
    const mb = total / (k * k);
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`.padEnd(colTotal);
    if (mb < 1) return `${mb.toFixed(2)}MB`.padEnd(colTotal);
    return `${mb.toFixed(1)}MB`.padEnd(colTotal);
}

/**
 * Alias for formatTotalDisplay (backward compat).
 */
export const formatTotal = formatTotalDisplay;

/**
 * Pad a pre-formatted speed string to COL_SPEED.
 */
export function formatSpeed(speed: string, colSpeed = COL_SPEED): string {
    return speed.padEnd(colSpeed);
}

/**
 * Convert bytes/second to a compact display string (KB or MB, no label for MB).
 */
export function formatSpeedDisplay(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0B';
    const k = 1024;
    const kbps = bytesPerSecond / k;
    if (kbps < 100) return `${Math.round(kbps)}KB`;
    return `${(bytesPerSecond / (k * k)).toFixed(1)}`;
}

/**
 * Format total aggregate speed, padded to COL_SPEED.
 */
export function formatTotalSpeed(bytesPerSecond: number, colSpeed = COL_SPEED): string {
    return formatSpeedDisplay(bytesPerSecond).padEnd(colSpeed);
}
