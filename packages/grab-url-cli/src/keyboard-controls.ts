/**
 * @description Raw-mode keyboard listener and interactive URL-prompt for the CLI downloader.
 * Receives callbacks so it stays decoupled from MultiColorFileDownloaderCLI internals.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { colors } from './display/progress-format.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeyboardCallbacks {
    isPaused: () => boolean;
    pauseAll: () => void;
    resumeAll: () => void;
    isAddingUrl: () => boolean;
    setAddingUrl: (v: boolean) => void;
    hasMultiBar: () => boolean;
    addToMultipleDownloads: (url: string, outputPath: string, filename: string) => Promise<void>;
    downloadFile: (url: string, outputPath: string) => Promise<void>;
}

// ─── Keyboard listener ────────────────────────────────────────────────────────

/**
 * Attach a raw-mode stdin listener.
 * - Ctrl+C → exit
 * - p      → toggle pause/resume
 * - a      → prompt to add a URL
 */
export function setupKeyboardListener(callbacks: KeyboardCallbacks): void {
    if (!process.stdin.isTTY) return;

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', async (str: string) => {
        if (str === '\u0003') {
            console.log(colors.warning.bold('\n🛑 Downloads cancelled by user'));
            process.exit(0);
        }
        if (str.toLowerCase() === 'p') {
            if (!callbacks.isPaused()) callbacks.pauseAll();
            else callbacks.resumeAll();
        }
        if (str.toLowerCase() === 'a' && !callbacks.isAddingUrl()) {
            await promptForNewUrl(callbacks);
        }
    });
}

/**
 * Tear down raw mode (called on cleanup).
 */
export function teardownKeyboardListener(): void {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
    }
}

// ─── URL prompt ───────────────────────────────────────────────────────────────

/**
 * Interactively prompt the user for a new URL and start downloading it,
 * either adding it to an existing multi-bar or starting a standalone download.
 */
export async function promptForNewUrl(callbacks: KeyboardCallbacks): Promise<void> {
    callbacks.setAddingUrl(true);
    try {
        console.log(colors.cyan('\n📥 Enter URL to add (or press Enter to cancel):'));
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const newUrl = await new Promise<string>(resolve =>
            rl.question('', a => { rl.close(); resolve(a.trim()); })
        );

        if (newUrl && isValidUrl(newUrl)) {
            const filename = generateFilename(newUrl, process.cwd());
            const outputPath = path.isAbsolute(filename) ? filename : path.join(process.cwd(), filename);

            try {
                const dir = path.dirname(outputPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            } catch (e: any) {
                console.error(colors.error.bold('❌ Could not create output dir: ') + e.message);
                return;
            }

            if (callbacks.hasMultiBar()) {
                await callbacks.addToMultipleDownloads(newUrl, outputPath, filename);
            } else {
                callbacks.downloadFile(newUrl, outputPath).catch((e: any) =>
                    console.error(colors.error(`❌ ${e.message}`))
                );
            }
            console.log(colors.success('🚀 New download started!'));
        } else if (newUrl) {
            console.log(colors.error('❌ Invalid URL.'));
        } else {
            console.log(colors.warning('⚠️  Cancelled.'));
        }
    } catch (e: any) {
        console.error(colors.error('❌ Error: ') + e.message);
    } finally {
        callbacks.setAddingUrl(false);
        console.log(callbacks.isPaused()
            ? colors.warning('⏸️  Still paused. Press p to resume, a to add URL.')
            : colors.success('▶️  Downloads active. Press p to pause, a to add URL.'));
    }
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

/** Check whether a string is a valid URL. */
export function isValidUrl(url: string): boolean {
    try { new URL(url); return true; } catch { return false; }
}

/** Derive a local filename from a URL pathname. */
export function generateFilename(url: string, dir?: string): string {
    let base: string;
    try { base = path.basename(new URL(url).pathname) || 'downloaded-file'; }
    catch { base = 'downloaded-file'; }

    if (!dir) return base;

    const ext = path.extname(base);
    const name = ext ? base.slice(0, -ext.length) : base;
    let candidate = base;
    let i = 1;
    while (fs.existsSync(path.join(dir, candidate))) {
        candidate = `${name}(${i})${ext}`;
        i++;
    }
    return candidate;
}

/** Extract the file extension from a URL pathname. */
export function getFileExtension(url: string): string {
    try { return path.extname(new URL(url).pathname).toLowerCase(); }
    catch { return ''; }
}
