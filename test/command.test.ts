/**
 * @file command.test.ts
 * @description Integration tests for the CLI downloader.
 * These tests use a small, real HTTP server (via Vitest) to verify the
 * full download pipeline without hitting external servers.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';

import { MultiColorFileDownloaderCLI } from '../packages/grab-url-cli/src/file-downloader.js';

// ─── Tiny local HTTP server ───────────────────────────────────────────────────

const FILE_CONTENT = 'A'.repeat(64 * 1024); // 64 KB of 'A'

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
    server = http.createServer((req, res) => {
        const url = req.url;

        // ── /file — standard download ──────────────────────────────────────────
        if (url === '/file') {
            const data = Buffer.from(FILE_CONTENT);
            const rangeHeader = req.headers['range'];
            if (rangeHeader) {
                const [, rangeStr] = rangeHeader.split('=');
                const [startStr] = rangeStr.split('-');
                const start = parseInt(startStr, 10);
                const chunk = data.subarray(start);
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${data.length - 1}/${data.length}`,
                    'Content-Length': String(chunk.length),
                    'Accept-Ranges': 'bytes',
                });
                res.end(chunk);
            } else {
                res.writeHead(200, {
                    'Content-Length': String(data.length),
                    'Accept-Ranges': 'bytes',
                    'ETag': '"test-etag"',
                });
                res.end(data);
            }
        }

        // ── /file-head — HEAD request ──────────────────────────────────────────
        else if (url === '/file' && req.method === 'HEAD') {
            res.writeHead(200, {
                'Content-Length': String(FILE_CONTENT.length),
                'Accept-Ranges': 'bytes',
                'ETag': '"test-etag"',
            });
            res.end();
        }

        // ── /api-json — API mode (JSON) ────────────────────────────────────────
        else if (url === '/api-json') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', items: [1, 2, 3] }));
        }

        // ── /slow — returns first 1 KB then pauses instantly (for cancel test) ─
        else if (url === '/slow') {
            const data = Buffer.from('B'.repeat(4 * 1024));
            res.writeHead(200, { 'Content-Length': String(data.length), 'Accept-Ranges': 'bytes' });
            res.write(data.subarray(0, 1024));
            // never finish — will be aborted by the test
        }

        else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
        server.close(err => (err ? reject(err) : resolve()))
    );
});

// ─── Per-test setup ───────────────────────────────────────────────────────────

let testDir: string;
let downloader: MultiColorFileDownloaderCLI;

beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grab-cmd-'));
    downloader = new MultiColorFileDownloaderCLI();
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
    downloader.cleanup();
    vi.restoreAllMocks();
    fs.rmSync(testDir, { recursive: true, force: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CLI Downloader — multiple files', () => {
    it('downloads multiple files concurrently', async () => {
        const downloads = [
            { url: `${baseUrl}/file`, outputPath: path.join(testDir, 'a.bin'), filename: 'a.bin' },
            { url: `${baseUrl}/file`, outputPath: path.join(testDir, 'b.bin'), filename: 'b.bin' },
        ];

        await downloader.downloadMultipleFiles(downloads);

        for (const dl of downloads) {
            expect(fs.existsSync(dl.outputPath)).toBe(true);
            expect(fs.readFileSync(dl.outputPath, 'utf8')).toBe(FILE_CONTENT);
        }
    }, 20_000);

    it('continues other downloads when one fails', async () => {
        const downloads = [
            { url: `${baseUrl}/file`, outputPath: path.join(testDir, 'ok.bin'), filename: 'ok.bin' },
            { url: `${baseUrl}/does-not-exist`, outputPath: path.join(testDir, 'err.bin'), filename: 'err.bin' },
        ];

        // Should not throw even if one file 404s
        await expect(downloader.downloadMultipleFiles(downloads)).resolves.not.toThrow();
        expect(fs.existsSync(downloads[0].outputPath)).toBe(true);
    }, 20_000);
});

describe('CLI Downloader — pause / resume state', () => {
    it('pauseAll() sets isPaused and resumeAll() clears it', () => {
        expect(downloader.isPaused).toBe(false);
        downloader.pauseAll();
        expect(downloader.isPaused).toBe(true);
        downloader.resumeAll();
        expect(downloader.isPaused).toBe(false);
    });

    it('cleanup() aborts without throwing', () => {
        expect(() => downloader.cleanup()).not.toThrow();
    });
});
