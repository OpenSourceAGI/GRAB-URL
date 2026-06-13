/**
 * @file downloader.test.ts
 * @description Unit tests for the CLI downloader helper modules:
 *   - display/progress-format.ts   (pure formatting functions)
 *   - transfer/resume-state.ts     (state file I/O + resume decision)
 *   - display/spinner-config.ts    (spinner frame lookup + bar colors)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── download-format ──────────────────────────────────────────────────────────

import {
    formatBytesCompact, formatBytesPlain,
    formatETA, formatTotalDisplay, formatSpeed, formatSpeedDisplay,
    truncateFilename, formatProgress,
} from '../packages/grab-url-cli/src/display/progress-format.js';

describe('download-format — formatBytesCompact()', () => {
    it('formats 0 as "0B"', () => expect(formatBytesCompact(0)).toBe('0B'));
    it('formats small KB values as whole-number KB', () => expect(formatBytesCompact(51200)).toBe('50KB'));
    it('formats large values as MB with 1 decimal', () => expect(formatBytesCompact(52428800)).toBe('50.0'));
});

describe('download-format — formatBytesPlain()', () => {
    it('labels bytes correctly', () => expect(formatBytesPlain(512)).toBe('512 B'));
    it('labels KB correctly', () => expect(formatBytesPlain(2048)).toBe('2 KB'));
    it('labels MB correctly', () => expect(formatBytesPlain(5 * 1024 * 1024)).toBe('5 MB'));
    it('labels GB correctly', () => expect(formatBytesPlain(2 * 1024 ** 3)).toBe('2 GB'));
});

describe('download-format — formatETA()', () => {
    it('returns "--" for 0s', () => expect(formatETA(0)).toContain('--'));
    it('returns "--" for Infinity', () => expect(formatETA(Infinity)).toContain('--'));
    it('returns "--" for negative', () => expect(formatETA(-1)).toContain('--'));
    it('formats 90s as 0:01:30', () => expect(formatETA(90)).toContain('0:01:30'));
    it('formats 3661s as 1:01:01', () => expect(formatETA(3661)).toContain('1:01:01'));
});

describe('download-format — formatTotalDisplay()', () => {
    it('returns "0MB" padded for 0 bytes', () => expect(formatTotalDisplay(0).trim()).toBe('0MB'));
    it('formats 1.5 GB correctly', () => {
        const out = formatTotalDisplay(1.5 * 1024 ** 3).trim();
        expect(out).toBe('1.5GB');
    });
    it('formats 250 MB correctly', () => {
        const out = formatTotalDisplay(250 * 1024 ** 2).trim();
        expect(out).toBe('250.0MB');
    });
});

describe('download-format — formatSpeed()', () => {
    it('pads to COL_SPEED characters', () => {
        const result = formatSpeed('1MB');
        expect(result.length).toBeGreaterThanOrEqual(3);
    });
});

describe('download-format — formatSpeedDisplay()', () => {
    it('returns "0B" for 0 bps', () => expect(formatSpeedDisplay(0)).toBe('0B'));
    it('returns KB format for small speeds', () => expect(formatSpeedDisplay(50 * 1024)).toBe('50KB'));
});

describe('download-format — truncateFilename()', () => {
    it('passes through short names untouched', () => {
        expect(truncateFilename('file.zip', 30).trim()).toBe('file.zip');
    });
    it('truncates long names with ellipsis', () => {
        const name = 'a-very-long-filename-that-exceeds-the-limit.tar.gz';
        const result = truncateFilename(name, 20);
        expect(result.length).toBe(20);
        expect(result).toContain('...');
    });
    it('preserves the extension in truncated names', () => {
        const result = truncateFilename('super-long-name-for-testing.zip', 15);
        expect(result.trim()).toContain('.zip');
    });
});

// ─── download-state ───────────────────────────────────────────────────────────

import {
    getStateDirectory, ensureStateDirectory, getStateFilePath,
    loadDownloadState, saveDownloadState, cleanupStateFile,
    getPartialFileSize, resolveResumeDecision,
    type DownloadState, type ServerInfo,
} from '../packages/grab-url-cli/src/transfer/resume-state.js';

describe('download-state — directory helpers', () => {
    it('getStateDirectory() respects GRAB_DOWNLOAD_STATE_DIR env var', () => {
        const old = process.env.GRAB_DOWNLOAD_STATE_DIR;
        process.env.GRAB_DOWNLOAD_STATE_DIR = '/tmp/custom-state';
        expect(getStateDirectory()).toBe('/tmp/custom-state');
        if (old !== undefined) process.env.GRAB_DOWNLOAD_STATE_DIR = old;
        else delete process.env.GRAB_DOWNLOAD_STATE_DIR;
    });

    it('getStateFilePath() appends .download-state', () => {
        const p = getStateFilePath('/tmp/states', '/downloads/file.zip');
        expect(p).toContain('file.zip.download-state');
        expect(p).toContain(path.join('/tmp', 'states'));
    });
});

describe('download-state — state file I/O', () => {
    let tmpDir: string;
    let stateFile: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grab-test-'));
        stateFile = path.join(tmpDir, 'test.download-state');
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('saveDownloadState + loadDownloadState round-trips correctly', () => {
        const state: DownloadState = {
            url: 'https://example.com/file.zip',
            outputPath: '/tmp/file.zip',
            totalSize: 1024,
            startByte: 512,
            lastModified: 'Wed, 01 Jan 2025 00:00:00 GMT',
            etag: '"abc123"',
            timestamp: new Date().toISOString(),
        };
        saveDownloadState(stateFile, state);
        const loaded = loadDownloadState(stateFile);
        expect(loaded).toMatchObject({ url: state.url, startByte: 512, totalSize: 1024 });
    });

    it('loadDownloadState returns null when file is absent', () => {
        expect(loadDownloadState('/nonexistent/path.state')).toBeNull();
    });

    it('cleanupStateFile removes the file', () => {
        fs.writeFileSync(stateFile, '{}');
        cleanupStateFile(stateFile);
        expect(fs.existsSync(stateFile)).toBe(false);
    });

    it('cleanupStateFile is a no-op when file does not exist', () => {
        expect(() => cleanupStateFile('/nonexistent/x.state')).not.toThrow();
    });

    it('getPartialFileSize returns 0 for missing file', () => {
        expect(getPartialFileSize('/nonexistent/partial.tmp')).toBe(0);
    });

    it('getPartialFileSize returns actual byte count', () => {
        const tmp = path.join(tmpDir, 'partial.tmp');
        fs.writeFileSync(tmp, 'hello world');
        expect(getPartialFileSize(tmp)).toBe(11);
    });
});

describe('download-state — resolveResumeDecision()', () => {
    let tmpDir: string;

    beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grab-resume-')); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    const server: ServerInfo = {
        supportsResume: true,
        totalSize: 1000,
        lastModified: 'Mon, 01 Jan 2024',
        etag: '"etag1"',
        headers: null,
    };

    it('resumes from correct byte when server and state match', () => {
        const tmp = path.join(tmpDir, 'f.tmp');
        const state = path.join(tmpDir, 'f.state');
        fs.writeFileSync(tmp, 'a'.repeat(500));
        const savedState: DownloadState = {
            url: 'https://x.com/f', outputPath: '/f',
            totalSize: 1000, startByte: 0,
            lastModified: 'Mon, 01 Jan 2024', etag: '"etag1"',
            timestamp: '',
        };
        saveDownloadState(state, savedState);

        const { startByte, resuming } = resolveResumeDecision(server, savedState, 500, tmp, state);
        expect(resuming).toBe(true);
        expect(startByte).toBe(500);
    });

    it('starts fresh when server etag changed', () => {
        const changedServer: ServerInfo = { ...server, etag: '"new-etag"' };
        const tmp = path.join(tmpDir, 'g.tmp');
        fs.writeFileSync(tmp, 'x'.repeat(300));
        const savedState: DownloadState = {
            url: '', outputPath: '', totalSize: 1000, startByte: 0,
            lastModified: 'Mon, 01 Jan 2024', etag: '"old-etag"', timestamp: '',
        };

        const { resuming } = resolveResumeDecision(changedServer, savedState, 300, tmp, '/no-state');
        expect(resuming).toBe(false);
        expect(fs.existsSync(tmp)).toBe(false); // partial deleted
    });

    it('starts fresh when server does not support resume', () => {
        const noResume: ServerInfo = { ...server, supportsResume: false };
        const tmp = path.join(tmpDir, 'h.tmp');
        fs.writeFileSync(tmp, 'x'.repeat(100));

        const { resuming } = resolveResumeDecision(noResume, null, 100, tmp, '/no-state');
        expect(resuming).toBe(false);
        expect(fs.existsSync(tmp)).toBe(false);
    });

    it('returns startByte=0 when no partial file exists', () => {
        const { startByte, resuming } = resolveResumeDecision(server, null, 0, '/no.tmp', '/no.state');
        expect(resuming).toBe(false);
        expect(startByte).toBe(0);
    });
});

// ─── download-spinners ────────────────────────────────────────────────────────

import {
    spinnerTypes, getSpinnerFrames, getRandomSpinner,
    getSpinnerWidth, calculateBarSize, getRandomBarColor, getRandomBarGlueColor,
    barColors, barGlueColors,
} from '../packages/grab-url-cli/src/display/spinner-config.js';

describe('download-spinners — spinner data', () => {
    it('loads a non-empty list of spinner types', () => {
        expect(spinnerTypes.length).toBeGreaterThan(10);
    });

    it('getSpinnerFrames returns an array of strings', () => {
        const frames = getSpinnerFrames('dots');
        expect(Array.isArray(frames)).toBe(true);
        expect(frames.length).toBeGreaterThan(0);
        expect(typeof frames[0]).toBe('string');
    });

    it('getSpinnerFrames falls back to dots for unknown type', () => {
        const frames = getSpinnerFrames('__nonexistent__');
        expect(frames.length).toBeGreaterThan(0);
    });

    it('getRandomSpinner returns a known type', () => {
        const type = getRandomSpinner();
        expect(spinnerTypes).toContain(type);
    });
});

describe('download-spinners — getSpinnerWidth()', () => {
    it('counts ASCII characters as width 1', () => expect(getSpinnerWidth('abc')).toBe(3));
    it('counts emoji as width 2', () => expect(getSpinnerWidth('😊')).toBe(2));
    it('handles mixed ASCII+emoji', () => expect(getSpinnerWidth('a😊b')).toBe(4));
    it('returns 0 for empty string', () => expect(getSpinnerWidth('')).toBe(0));
});

describe('download-spinners — calculateBarSize()', () => {
    it('returns a positive number', () => {
        expect(calculateBarSize('⠋', 20)).toBeGreaterThan(0);
    });
    it('never exceeds the base bar size', () => {
        const result = calculateBarSize('-', 20);
        expect(result).toBeLessThanOrEqual(20);
    });
});

describe('download-spinners — color pickers', () => {
    it('getRandomBarColor returns a color from the pool', () => {
        expect(barColors).toContain(getRandomBarColor());
    });
    it('getRandomBarGlueColor returns a gue color from the pool', () => {
        expect(barGlueColors).toContain(getRandomBarGlueColor());
    });
});

// ─── MultiColorFileDownloaderCLI (integration smoke) ───────────────────────────────────

import { MultiColorFileDownloaderCLI } from '../packages/grab-url-cli/src/file-downloader.js';

describe('MultiColorFileDownloaderCLI — instance', () => {
    it('constructs without error', () => {
        expect(() => new MultiColorFileDownloaderCLI()).not.toThrow();
    });

    it('delegates formatBytes correctly', () => {
        const d = new MultiColorFileDownloaderCLI();
        // The delegated method should produce colored but non-empty output
        const out = d.formatBytes(1024 * 1024);
        expect(typeof out).toBe('string');
        expect(out.length).toBeGreaterThan(0);
    });

    it('delegates generateFilename from URL', () => {
        const d = new MultiColorFileDownloaderCLI();
        expect(d.generateFilename('https://example.com/archive.tar.gz')).toBe('archive.tar.gz');
        expect(d.generateFilename('https://example.com/')).toBe('downloaded-file');
    });

    it('pause / resume cycle works', () => {
        const d = new MultiColorFileDownloaderCLI();
        expect(d.isPaused).toBe(false);
        d.pauseAll();
        expect(d.isPaused).toBe(true);
        d.resumeAll();
        expect(d.isPaused).toBe(false);
    });

    it('cleanup() does not throw when nothing is running', () => {
        const d = new MultiColorFileDownloaderCLI();
        expect(() => d.cleanup()).not.toThrow();
    });
});
