/**
 * @file downloader.ts
 * @description MultiColorFileDownloaderCLI — thin orchestrator class.
 *
 * All heavy logic lives in dedicated modules:
 *   Formatting    → ./display/progress-format.ts
 *   Spinners      → ./display/spinner-config.ts
 *   State / resume → ./transfer/resume-state.ts
 *   Keyboard      → ./keyboard-controls.ts
 *   Single file   → ./transfer/single-file-transfer.ts
 *   Multi file    → ./transfer/multi-file-transfer.ts
 */

import {
    colors,
    formatBytes, formatBytesCompact, formatTotalDisplay, formatTotal,
    formatETA, formatMasterProgress, formatProgress,
    formatSpeed, formatSpeedDisplay, formatTotalSpeed, truncateFilename,
    COL_FILENAME, COL_SPINNER, COL_BAR, COL_PERCENT,
    COL_DOWNLOADED, COL_TOTAL, COL_SPEED, COL_ETA,
} from './display/progress-format.js';

import {
    getSpinnerFrames, getRandomSpinner, getRandomOraSpinner,
    getSpinnerWidth, calculateBarSize, getRandomBarColor, getRandomBarGlueColor,
} from './display/spinner-config.js';

import {
    getStateDirectory, ensureStateDirectory, getStateFilePath,
} from './transfer/resume-state.js';

import {
    setupKeyboardListener, teardownKeyboardListener,
    isValidUrl, generateFilename, getFileExtension,
    type KeyboardCallbacks,
} from './keyboard-controls.js';

import {
    downloadFile as _downloadFile,
    type SingleDownloadContext,
} from './transfer/single-file-transfer.js';

import {
    downloadMultipleFiles as _downloadMultipleFiles,
    downloadSingleFileWithBar as _downloadSingleFileWithBar,
    addFileToMultiBar,
    type Download, type TotalTracking, type MultiDownloadContext,
} from './transfer/multi-file-transfer.js';

export type { Download };

// ─── MultiColorFileDownloaderCLI ──────────────────────────────────────────────────────

export class MultiColorFileDownloaderCLI {
    progressBar: any = null;
    multiBar: any = null;
    loadingSpinner: any = null;
    abortController: AbortController | null = null;
    abortControllers: AbortController[] = [];

    isPaused = false;
    pauseCallback: (() => void) | null = null;
    resumeCallback: (() => void) | null = null;
    isAddingUrl = false;
    stateDir: string;

    // Column constants (kept for backward compat)
    readonly COL_FILENAME = COL_FILENAME;
    readonly COL_SPINNER = COL_SPINNER;
    readonly COL_BAR = COL_BAR;
    readonly COL_PERCENT = COL_PERCENT;
    readonly COL_DOWNLOADED = COL_DOWNLOADED;
    readonly COL_TOTAL = COL_TOTAL;
    readonly COL_SPEED = COL_SPEED;
    readonly COL_ETA = COL_ETA;
    readonly colors = colors;

    // Delegated helpers (kept for backward compat)
    formatBytes = formatBytes;
    formatBytesCompact = formatBytesCompact;
    formatTotalDisplay = formatTotalDisplay;
    formatTotal = formatTotal;
    formatETA = formatETA;
    formatMasterProgress = formatMasterProgress;
    formatProgress = formatProgress;
    formatSpeed = formatSpeed;
    formatSpeedDisplay = formatSpeedDisplay;
    formatTotalSpeed = formatTotalSpeed;
    truncateFilename = truncateFilename;
    getSpinnerFrames = getSpinnerFrames;
    getRandomSpinner = getRandomSpinner;
    getRandomOraSpinner = getRandomOraSpinner;
    getSpinnerWidth = getSpinnerWidth;
    calculateBarSize = calculateBarSize;
    getRandomBarColor = getRandomBarColor;
    getRandomBarGlueColor = getRandomBarGlueColor;
    isValidUrl = isValidUrl;
    generateFilename = generateFilename;
    getFileExtension = getFileExtension;
    getRandomColor() { return colors.gradient[Math.floor(Math.random() * colors.gradient.length)]; }

    constructor() {
        this.stateDir = ensureStateDirectory(getStateDirectory());
    }

    // ── Lifecycle ───────────────────────────────────────────────────────────────

    setPauseCallback(cb: () => void) { this.pauseCallback = cb; }
    setResumeCallback(cb: () => void) { this.resumeCallback = cb; }

    pauseAll() {
        this.isPaused = true;
        console.log(colors.warning('⏸️  Pausing all downloads...'));
        this.pauseCallback?.();
    }

    resumeAll() {
        this.isPaused = false;
        console.log(colors.success('▶️  Resuming all downloads...'));
        this.resumeCallback?.();
    }

    cleanup() {
        if (this.loadingSpinner?.isSpinning) this.loadingSpinner.stop();
        if (this.progressBar) this.progressBar.stop();
        if (this.multiBar) this.multiBar.stop();
        if (this.abortController) this.abortController.abort();
        teardownKeyboardListener();
    }

    // ── Keyboard ────────────────────────────────────────────────────────────────

    setupGlobalKeyboardListener() {
        const cbs: KeyboardCallbacks = {
            isPaused: () => this.isPaused,
            pauseAll: () => this.pauseAll(),
            resumeAll: () => this.resumeAll(),
            isAddingUrl: () => this.isAddingUrl,
            setAddingUrl: (v) => { this.isAddingUrl = v; },
            hasMultiBar: () => !!this.multiBar,
            addToMultipleDownloads: (u, o, f) => this.addToMultipleDownloads(u, o, f),
            downloadFile: (u, o) => this.downloadFile(u, o),
        };
        setupKeyboardListener(cbs);
    }

    // ── Single-file download ────────────────────────────────────────────────────

    async downloadFile(url: string, outputPath: string) {
        const ctx: SingleDownloadContext = {
            isPaused: this.isPaused,
            progressBar: this.progressBar,
            abortController: this.abortController,
            stateFilePath: (p) => getStateFilePath(this.stateDir, p),
            setupKeyboard: () => this.setupGlobalKeyboardListener(),
        };
        // sync the live isPaused reference on each tick via getter
        Object.defineProperty(ctx, 'isPaused', { get: () => this.isPaused });
        await _downloadFile(url, outputPath, ctx);
        this.progressBar = ctx.progressBar;
        this.abortController = ctx.abortController;
    }

    // ── Multi-file download ─────────────────────────────────────────────────────

    async downloadMultipleFiles(downloads: Download[]) {
        const ctx: MultiDownloadContext = {
            isPaused: false,
            multiBar: null,
            abortControllers: this.abortControllers,
            stateFilePath: (p) => getStateFilePath(this.stateDir, p),
            setupKeyboard: () => this.setupGlobalKeyboardListener(),
            pushAbortController: (c) => this.abortControllers.push(c),
        };
        Object.defineProperty(ctx, 'isPaused', { get: () => this.isPaused });
        await _downloadMultipleFiles(downloads, ctx);
        this.multiBar = ctx.multiBar;
        this.abortControllers = ctx.abortControllers;
    }

    async downloadSingleFileWithBar(fileBar: any, masterBar: any, _n: number, tracking: TotalTracking) {
        const ctx: MultiDownloadContext = {
            isPaused: false,
            multiBar: this.multiBar,
            abortControllers: this.abortControllers,
            stateFilePath: (p) => getStateFilePath(this.stateDir, p),
            setupKeyboard: () => this.setupGlobalKeyboardListener(),
            pushAbortController: (c) => this.abortControllers.push(c),
        };
        Object.defineProperty(ctx, 'isPaused', { get: () => this.isPaused });
        await _downloadSingleFileWithBar(fileBar, masterBar, tracking, ctx);
    }

    async addToMultipleDownloads(url: string, outputPath: string, filename: string) {
        const ctx: MultiDownloadContext = {
            isPaused: false,
            multiBar: this.multiBar,
            abortControllers: this.abortControllers,
            stateFilePath: (p) => getStateFilePath(this.stateDir, p),
            setupKeyboard: () => { },
            pushAbortController: (c) => this.abortControllers.push(c),
        };
        Object.defineProperty(ctx, 'isPaused', { get: () => this.isPaused });
        await addFileToMultiBar(url, outputPath, filename, ctx);
    }
}
