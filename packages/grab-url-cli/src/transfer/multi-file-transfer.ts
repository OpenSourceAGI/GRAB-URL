/**
 * @file download-multi.ts
 * @description Concurrent multi-file download with a shared MultiBar, per-file
 * progress bars, a master aggregate bar, and speed-update interval.
 *
 * Three exported functions:
 *   downloadMultipleFiles     — orchestrates a batch download session
 *   downloadSingleFileWithBar — downloads one file and updates shared tracking
 *   addFileToMultiBar         — adds a new URL dynamically to a running session
 */

import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

import cliProgress from 'cli-progress';

import {
    COL_BAR, COL_FILENAME, COL_PERCENT, COL_SPEED,
    colors,
    formatBytesCompact, formatTotalDisplay,
    formatETA, formatMasterProgress, formatProgress,
    formatSpeed, formatSpeedDisplay, formatTotalSpeed,
    truncateFilename,
} from '../display/progress-format.js';

import {
    getSpinnerFrames, getRandomSpinner,
    getSpinnerWidth, calculateBarSize,
    getRandomBarColor, getRandomBarGlueColor,
} from '../display/spinner-config.js';

import {
    checkServerSupport, resolveResumeDecision,
    loadDownloadState, saveDownloadState,
    getPartialFileSize, cleanupStateFile,
    type DownloadState,
} from './resume-state.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Download {
    url: string;
    outputPath: string;
    filename: string;
    estimatedSize?: number;
    index?: number;
}

export interface TotalTracking {
    totalDownloaded: number;
    totalSize: number;
    individualSpeeds: number[];
    individualSizes: number[];
    individualDownloaded: number[];
    individualStartTimes: number[];
    lastTotalUpdate: number;
    lastTotalDownloaded: number;
    actualTotalSize: number;
}

export interface MultiDownloadContext {
    isPaused: boolean;
    multiBar: any;                         // set by downloadMultipleFiles
    abortControllers: AbortController[];
    setupKeyboard: () => void;
    stateFilePath: (outputPath: string) => string;
    pushAbortController: (c: AbortController) => void;
}

// ─── Bar helpers (module-private) ─────────────────────────────────────────────

function barFormat(barColor: string) {
    return colors.yellow('{filename}') + ' ' + colors.cyan('{spinner}') + ' ' +
        barColor + '{bar}\u001b[0m' + ' ' +
        colors.success('{percentage}%') + ' ' +
        colors.info('{downloadedDisplay}') + ' ' + colors.info('{totalDisplay}') + ' ' +
        colors.purple('{speed}') + ' ' + colors.pink('{etaFormatted}');
}

function barOptions(barColor: string, barGlue: string, barSize: number) {
    return { format: barFormat(barColor), barCompleteChar: '█', barIncompleteChar: '░', barGlue, barsize: barSize };
}

function barPayload(frames: string[]) {
    return {
        filename: '', spinner: frames[0],
        speed: formatSpeed('0B'), progress: formatProgress(0, 0),
        downloadedDisplay: formatBytesCompact(0), totalDisplay: formatTotalDisplay(0),
        etaFormatted: formatETA(0), percentage: '  0'.padStart(3),
    };
}

// ─── Batch download ───────────────────────────────────────────────────────────

/**
 * Download multiple files concurrently, each with its own progress bar inside
 * a shared MultiBar container and a master aggregate row.
 */
export async function downloadMultipleFiles(
    downloads: Download[],
    ctx: MultiDownloadContext,
): Promise<void> {
    try {
        ctx.setupKeyboard();

        const masterBc = getRandomBarColor();
        const masterBg = getRandomBarGlueColor();

        ctx.multiBar = new cliProgress.MultiBar({
            format: colors.success('{percentage}%') + ' ' +
                colors.yellow('{filename}') + ' ' + colors.cyan('{spinner}') + ' ' +
                masterBc + '{bar}\u001b[0m' + ' ' +
                colors.info('{downloadedDisplay}') + ' ' + colors.info('{totalDisplay}') + ' ' +
                colors.purple('{speed}') + ' ' + colors.pink('{etaFormatted}'),
            hideCursor: true, clearOnComplete: false, stopOnComplete: true,
            autopadding: false, barCompleteChar: '█', barIncompleteChar: '░',
            barGlue: masterBg, barsize: COL_BAR,
        });

        const n = downloads.length;
        const isSingle = n === 1;
        const indSpeeds = new Array(n).fill(0);
        const indSizes = new Array(n).fill(0);
        const indDl = new Array(n).fill(0);
        const indStart = new Array(n).fill(Date.now());
        let lastIndDl = new Array(n).fill(0);
        let lastSpeedUpdate = Date.now();
        let totalSize = downloads.reduce((s, d) => s + (d.estimatedSize ?? 100 * 1024 * 1024), 0);

        let masterBar: any = null;
        if (!isSingle) {
            const masterSW = getSpinnerWidth('⬇️');
            masterBar = ctx.multiBar.create(totalSize, 0, {
                filename: 'Total'.padEnd(COL_FILENAME - masterSW), spinner: '⬇️',
                speed: '0B'.padEnd(COL_SPEED), progress: formatMasterProgress(0, totalSize),
                downloadedDisplay: formatBytesCompact(0), totalDisplay: formatTotalDisplay(totalSize),
                etaFormatted: formatETA(0), percentage: '  0'.padStart(COL_PERCENT - 1),
            }, {
                format: colors.success('{percentage}%') + ' ' + colors.yellow.bold('{filename}') + ' ' +
                    colors.success('{spinner}') + ' ' + '\u001b[92m{bar}\u001b[0m' + ' ' +
                    colors.info('{downloadedDisplay}') + ' ' + colors.info('{totalDisplay}') + ' ' +
                    colors.purple('{speed}') + ' ' + colors.pink('{etaFormatted}'),
                barCompleteChar: '▶', barIncompleteChar: '▷',
                barGlue: '\u001b[33m', barsize: calculateBarSize('⬇️', COL_BAR),
            });
        }

        const fileBars = downloads.map((dl, idx) => {
            const frames = getSpinnerFrames(getRandomSpinner());
            const sw = getSpinnerWidth(frames[0]);
            const bc = getRandomBarColor(), bg = getRandomBarGlueColor();
            return {
                bar: ctx.multiBar.create(100, 0,
                    { ...barPayload(frames), filename: truncateFilename(dl.filename, COL_FILENAME - sw) },
                    barOptions(bc, bg, calculateBarSize(frames[0], COL_BAR)),
                ),
                spinnerFrames: frames, spinnerIndex: 0,
                lastSpinnerUpdate: Date.now(), lastFrameUpdate: Date.now(),
                download: { ...dl, index: idx },
            };
        });

        const speedInterval = setInterval(() => {
            const now = Date.now(), dt = (now - lastSpeedUpdate) / 1000;
            for (let i = 0; i < n; i++) {
                if (dt > 0) {
                    indSpeeds[i] = (indDl[i] - lastIndDl[i]) / dt;
                    fileBars[i]?.bar?.update(indDl[i], {
                        speed: formatSpeed(formatSpeedDisplay(indSpeeds[i])),
                        progress: formatProgress(indDl[i], indSizes[i]),
                        downloadedDisplay: formatBytesCompact(indDl[i]),
                        totalDisplay: formatTotalDisplay(indSizes[i]),
                        etaFormatted: indSizes[i] > 0
                            ? formatETA((indSizes[i] - indDl[i]) / indSpeeds[i]) : formatETA(0),
                    });
                }
            }
            lastSpeedUpdate = now;
            lastIndDl = [...indDl];

            const totSpd = indSpeeds.reduce((s, v) => s + v, 0);
            const totDl = indDl.reduce((s, v) => s + v, 0);
            const discTot = indSizes.reduce((s, v) => s + v, 0);
            const dispTot = discTot > 0 ? discTot : totalSize;

            masterBar?.update(totDl, {
                speed: formatTotalSpeed(totSpd),
                progress: formatMasterProgress(totDl, dispTot),
                downloadedDisplay: formatBytesCompact(totDl),
                totalDisplay: formatTotalDisplay(dispTot),
                etaFormatted: formatETA((now - indStart[0]) / 1000),
                percentage: dispTot > 0 ? Math.round((totDl / dispTot) * 100) : 0,
            });
        }, 1000);

        const tracking: TotalTracking = {
            totalDownloaded: 0, totalSize,
            individualSpeeds: indSpeeds, individualSizes: indSizes,
            individualDownloaded: indDl, individualStartTimes: indStart,
            lastTotalUpdate: Date.now(), lastTotalDownloaded: 0, actualTotalSize: 0,
        };

        const results = await Promise.allSettled(
            fileBars.map(async (fb, i) => {
                try {
                    await downloadSingleFileWithBar(fb, masterBar, tracking, ctx);
                    return { success: true, i, filename: fb.download.filename };
                } catch (e: any) {
                    return { success: false, i, filename: fb.download.filename, error: e };
                }
            })
        );

        clearInterval(speedInterval);
        ctx.multiBar.stop();

        const ok = results.filter((r: any) => r.status === 'fulfilled' && r.value.success).length;
        const fail = results.length - ok;
        if (fail > 0) {
            console.log(colors.error(`❌ Failed: ${fail}/${n}`));
            results.forEach((r: any, i) => {
                if (r.status === 'rejected' || !r.value.success) {
                    const err = r.reason ?? r.value?.error ?? 'unknown';
                    console.log(colors.error(`  • ${downloads[i].filename}: ${err.message ?? err}`));
                }
            });
        }

        const emojis = ['🥳', '🎊', '🎈', '🌟', '💯', '🚀', '✨', '🔥'];
        console.log(colors.green(`${emojis[Math.floor(Math.random() * emojis.length)]} Success: ${ok}/${n}`));
        ctx.abortControllers = [];

    } catch (e: any) {
        if (ctx.multiBar) ctx.multiBar.stop();
        console.error(colors.error.bold('💥 Batch download failed: ') + colors.warning(e.message));
        throw e;
    }
}

// ─── Per-file download with bar ────────────────────────────────────────────────

/**
 * Download one file into an existing file-bar slot inside the multi-bar session.
 * Updates the shared TotalTracking as bytes arrive.
 */
export async function downloadSingleFileWithBar(
    fileBar: any,
    masterBar: any,
    tracking: TotalTracking,
    ctx: MultiDownloadContext,
): Promise<void> {
    const { bar, spinnerFrames, download } = fileBar;
    const { url, outputPath, filename } = download;
    const stateFilePath = ctx.stateFilePath(outputPath);
    const tempFilePath = outputPath + '.tmp';

    try {
        const ac = new AbortController();
        ctx.pushAbortController(ac);

        const serverInfo = await checkServerSupport(url, ac.signal);
        const previousState = loadDownloadState(stateFilePath);
        const partialSize = getPartialFileSize(tempFilePath);
        const { startByte, resuming } = resolveResumeDecision(
            serverInfo, previousState, partialSize, tempFilePath, stateFilePath,
        );

        const headers: Record<string, string> = {};
        if (resuming && startByte > 0) headers['Range'] = `bytes=${startByte}-`;

        const response = await fetch(url, { headers, signal: ac.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const cl = response.headers.get('content-length');
        const totalSize = resuming ? serverInfo.totalSize : (cl ? parseInt(cl, 10) : 0);

        saveDownloadState(stateFilePath, {
            url, outputPath, totalSize, startByte,
            lastModified: serverInfo.lastModified, etag: serverInfo.etag,
            timestamp: new Date().toISOString(),
        } as DownloadState);

        bar.setTotal(totalSize || 100);
        bar.update(startByte, {
            progress: formatProgress(startByte, totalSize),
            downloadedDisplay: formatBytesCompact(startByte),
            totalDisplay: formatTotalDisplay(totalSize),
        });

        const writeStream = fs.createWriteStream(tempFilePath, { flags: resuming ? 'a' : 'w' });
        let downloaded = startByte, lastTime = Date.now(), lastDl = downloaded;
        const progressStream = new Readable({ read() { } });
        const reader = (response.body as any).getReader();

        const processChunk = async () => {
            try {
                while (true) {
                    while (ctx.isPaused) await new Promise(r => setTimeout(r, 100));
                    const { done, value } = await reader.read();
                    if (done) { progressStream.push(null); break; }

                    downloaded += value.length;
                    const now = Date.now(), dt = (now - lastTime) / 1000;

                    if (now - fileBar.lastFrameUpdate >= 150) {
                        fileBar.spinnerIndex = (fileBar.spinnerIndex + 1) % spinnerFrames.length;
                        fileBar.lastFrameUpdate = now;
                        bar.options.barsize = calculateBarSize(spinnerFrames[fileBar.spinnerIndex], COL_BAR);
                    }
                    if (now - fileBar.lastSpinnerUpdate >= 45000) {
                        fileBar.spinnerFrames = getSpinnerFrames(getRandomSpinner());
                        fileBar.spinnerIndex = 0; fileBar.lastSpinnerUpdate = now;
                    }

                    const payload = {
                        spinner: spinnerFrames[fileBar.spinnerIndex],
                        progress: formatProgress(downloaded, totalSize),
                        downloadedDisplay: formatBytesCompact(downloaded),
                        totalDisplay: formatTotalDisplay(totalSize),
                    };

                    if (dt >= 0.3) {
                        bar.update(downloaded, payload);
                        const fi = fileBar.download.index ?? 0;
                        tracking.totalDownloaded += downloaded - lastDl;
                        tracking.individualDownloaded[fi] = downloaded;
                        tracking.individualSizes[fi] = totalSize;
                        tracking.totalSize = tracking.individualSizes.reduce((s, v) => s + v, 0);
                        if (tracking.actualTotalSize !== undefined) tracking.actualTotalSize = tracking.totalSize;
                        if (totalSize > 0 && tracking.individualSizes[fi] === totalSize)
                            masterBar?.setTotal(tracking.totalSize);
                        lastTime = now; lastDl = downloaded;
                    } else {
                        bar.update(downloaded, payload);
                    }
                    progressStream.push(Buffer.from(value));
                }
            } catch (e: any) { progressStream.destroy(e); }
        };

        processChunk();
        await pipeline(progressStream, writeStream);

        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        fs.renameSync(tempFilePath, outputPath);
        cleanupStateFile(stateFilePath);

        const disc = tracking.individualSizes.reduce((s, v) => s + v, 0);
        const disp = disc > 0 ? disc : (tracking.actualTotalSize || tracking.totalSize);
        masterBar?.update(tracking.totalDownloaded, {
            progress: formatMasterProgress(tracking.totalDownloaded, disp),
            downloadedDisplay: formatBytesCompact(tracking.totalDownloaded),
            totalDisplay: formatTotalDisplay(disp),
            etaFormatted: formatETA((Date.now() - (tracking.individualStartTimes?.[0] ?? Date.now())) / 1000),
        });

    } catch (e: any) {
        bar.update(bar.total, {
            spinner: '❌', speed: formatSpeed('FAILED'),
            downloadedDisplay: formatBytesCompact(0), totalDisplay: formatTotalDisplay(0),
        });
        console.log(colors.info(`💾 Partial download saved for ${filename}. Restart to resume.`));
        throw e;
    }
}

// ─── Add URL to running session ────────────────────────────────────────────────

/**
 * Dynamically add a new download to an already-running multi-bar session.
 */
export async function addFileToMultiBar(
    url: string,
    outputPath: string,
    filename: string,
    ctx: MultiDownloadContext,
): Promise<void> {
    const frames = getSpinnerFrames(getRandomSpinner());
    const sw = getSpinnerWidth(frames[0]);
    const bc = getRandomBarColor(), bg = getRandomBarGlueColor();
    const bs = calculateBarSize(frames[0], COL_BAR);

    const fileBar = {
        bar: ctx.multiBar.create(100, 0,
            { ...barPayload(frames), filename: truncateFilename(filename, COL_FILENAME - sw) },
            barOptions(bc, bg, bs),
        ),
        spinnerFrames: frames, spinnerIndex: 0,
        lastSpinnerUpdate: Date.now(), lastFrameUpdate: Date.now(),
        download: { url, outputPath, filename, index: 1 },
    };

    const tracking: TotalTracking = {
        totalDownloaded: 0, totalSize: 0,
        individualSpeeds: [], individualSizes: [], individualDownloaded: [],
        individualStartTimes: [], lastTotalUpdate: Date.now(), lastTotalDownloaded: 0, actualTotalSize: 0,
    };

    downloadSingleFileWithBar(fileBar, null, tracking, ctx)
        .catch((e: any) => console.error(colors.error(`❌ ${filename}: ${e.message}`)));
}
