/**
 * @file grab-url.ts
 * @description CLI entry point for grab-url. Supports API requests and file downloads.
 *
 * Usage:
 *   npx grab-url <url> [options]
 *   npx grab-url https://api.example.com/data
 *   npx grab-url https://example.com/file.zip
 */
export { MultiColorFileDownloaderCLI } from './file-downloader.js';
export type { Download } from './file-downloader.js';
export { isValidUrl, generateFilename, getFileExtension, } from './keyboard-controls.js';
export { ArgParser, isFileUrl } from './cli-args.js';
