/**
 * @file download-single.ts
 * @description Standalone single-file download with ora spinner + cli-progress bar,
 * resume support, and keyboard listeners.
 */

import fs from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

import cliProgress from "cli-progress";
import chalk from "chalk";

import {
  COL_BAR,
  colors,
  formatBytes,
  formatBytesCompact,
  formatTotalDisplay,
  formatETA,
  formatProgress,
  formatSpeed,
  formatSpeedDisplay,
} from "../display/progress-format.js";

import {
  getSpinnerFrames,
  getRandomSpinner,
  calculateBarSize,
  getRandomBarColor,
  getRandomBarGlueColor,
} from "../display/spinner-config.js";

import {
  checkServerSupport,
  resolveResumeDecision,
  loadDownloadState,
  saveDownloadState,
  getPartialFileSize,
  cleanupStateFile,
  type DownloadState,
} from "./resume-state.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SingleDownloadContext {
  /** Whether the download is currently paused */
  isPaused: boolean;
  /** The active progress bar instance (assigned by this function) */
  progressBar: any;
  /** Called to set up keyboard listeners */
  setupKeyboard: () => void;
  /** Called to get the state file path for a given output path */
  stateFilePath: (outputPath: string) => string;
  /** The AbortController for cancellation */
  abortController: AbortController | null;
}

// ─── Single-file download ─────────────────────────────────────────────────────

/**
 * Download one file with an ora loading spinner and a cli-progress bar.
 * Supports resume-from-partial, pause/resume, and graceful abort.
 *
 * @param url         Remote URL to fetch
 * @param outputPath  Absolute local destination path
 * @param ctx         Mutable context object (progressBar is written back to it)
 */
export async function downloadFile(
  url: string,
  outputPath: string,
  ctx: SingleDownloadContext,
): Promise<void> {
  const stateFilePath = ctx.stateFilePath(outputPath);
  const tempFilePath = outputPath + ".tmp";

  try {
    ctx.abortController = new AbortController();

    // ── Ora loading spinner ──────────────────────────────────────────────────
    // const { default: ora } = await import('ora');
    // const spinner = ora({
    //     text: colors.primary('🌐 Checking server capabilities...'),
    //     spinner: getRandomOraSpinner() as any,
    //     color: 'cyan',
    // }).start();

    const serverInfo = await checkServerSupport(
      url,
      ctx.abortController.signal,
    );
    const previousState = loadDownloadState(stateFilePath);
    const partialSize = getPartialFileSize(tempFilePath);
    let { startByte, resuming } = resolveResumeDecision(
      serverInfo,
      previousState,
      partialSize,
      tempFilePath,
      stateFilePath,
    );

    // if (resuming) {
    //   spinner.succeed(
    //     colors.success(
    //       `✅ Resuming from ${formatBytes(startByte)} of ${formatTotalDisplay(serverInfo.totalSize)}`,
    //     ),
    //   );
    //   console.log(colors.info(`🔄 Starting at byte ${startByte}`));
    // } else {
    //   spinner.stop();
    //   if (partialSize > 0)
    //     console.log(
    //       colors.warning("⚠️  Server does not support resume, starting fresh"),
    //     );
    // }

    // ── Fetch ────────────────────────────────────────────────────────────────
    const headers: Record<string, string> = {};
    if (resuming && startByte > 0) headers["Range"] = `bytes=${startByte}-`;

    const response = await fetch(url, {
      headers,
      signal: ctx.abortController.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const cl = response.headers.get("content-length");
    const totalSize = resuming
      ? serverInfo.totalSize
      : cl
        ? parseInt(cl, 10)
        : 0;

    if (!resuming) {
      if (totalSize === 0)
        console.log(colors.warning("⚠️  Content-Length not provided"));
      else
        console.log(
          colors.info(`📦 File size: ${formatTotalDisplay(totalSize)}`),
        );
    }

    // ── Persist state ────────────────────────────────────────────────────────
    saveDownloadState(stateFilePath, {
      url,
      outputPath,
      totalSize,
      startByte,
      lastModified: serverInfo.lastModified,
      etag: serverInfo.etag,
      timestamp: new Date().toISOString(),
    } as DownloadState);

    // ── Progress bar setup ───────────────────────────────────────────────────
    const barColor = getRandomBarColor();
    const barGlue = getRandomBarGlueColor();
    let spinnerFrames = getSpinnerFrames(getRandomSpinner());
    let spinnerIdx = 0;
    let lastSpinnerSwap = Date.now();
    let lastFrameUpdate = Date.now();

    ctx.setupKeyboard();

    ctx.progressBar = new cliProgress.SingleBar({
      format:
        colors.success("{percentage}%") +
        " " +
        colors.cyan("{spinner}") +
        " " +
        barColor +
        "{bar}\u001b[0m" +
        " " +
        colors.info("{downloadedDisplay}") +
        " " +
        colors.info("{totalDisplay}") +
        " " +
        colors.purple("{speed}") +
        " " +
        colors.pink("{etaFormatted}"),
      barCompleteChar: "█",
      barIncompleteChar: "░",
      barGlue,
      hideCursor: true,
      barsize: calculateBarSize(spinnerFrames[0], COL_BAR),
      stopOnComplete: true,
      clearOnComplete: false,
    });

    ctx.progressBar.start(totalSize || 100, startByte, {
      speed: formatSpeed("0B/s"),
      etaFormatted: formatETA(0),
      spinner: spinnerFrames[0],
      progress: formatProgress(startByte, totalSize),
      downloadedDisplay: formatBytesCompact(startByte),
      totalDisplay: formatTotalDisplay(totalSize),
    });

    // ── Stream download ──────────────────────────────────────────────────────
    const writeStream = fs.createWriteStream(tempFilePath, {
      flags: resuming ? "a" : "w",
    });
    let downloaded = startByte,
      sessionDl = 0;
    let lastTime = Date.now(),
      lastDl = downloaded;
    const progressStream = new Readable({ read() {} });
    const reader = (response.body as any).getReader();

    const processChunk = async () => {
      try {
        while (true) {
          while (ctx.isPaused) await new Promise((r) => setTimeout(r, 100));
          const { done, value } = await reader.read();
          if (done) {
            progressStream.push(null);
            break;
          }

          sessionDl += value.length;
          downloaded += value.length;
          const now = Date.now(),
            dt = (now - lastTime) / 1000;

          if (now - lastSpinnerSwap >= 45000) {
            spinnerFrames = getSpinnerFrames(getRandomSpinner());
            spinnerIdx = 0;
            lastSpinnerSwap = now;
          }
          if (now - lastFrameUpdate >= 120) {
            spinnerIdx = (spinnerIdx + 1) % spinnerFrames.length;
            lastFrameUpdate = now;
            ctx.progressBar.options.barsize = calculateBarSize(
              spinnerFrames[spinnerIdx],
              COL_BAR,
            );
          }

          const payload = {
            spinner: spinnerFrames[spinnerIdx],
            progress: formatProgress(downloaded, totalSize),
            downloadedDisplay: formatBytesCompact(downloaded),
            totalDisplay: formatTotalDisplay(totalSize),
          };

          if (dt >= 0.3) {
            const bps = (downloaded - lastDl) / dt;
            ctx.progressBar.update(downloaded, {
              ...payload,
              speed: formatSpeed(formatSpeedDisplay(bps)),
              etaFormatted:
                totalSize > 0
                  ? formatETA((totalSize - downloaded) / bps)
                  : formatETA(0),
            });
            lastTime = now;
            lastDl = downloaded;
          } else {
            ctx.progressBar.update(downloaded, payload);
          }
          progressStream.push(Buffer.from(value));
        }
      } catch (e: any) {
        progressStream.destroy(e);
      }
    };

    processChunk();
    await pipeline(progressStream, writeStream);
    ctx.progressBar.stop();

    // ── Finalise ─────────────────────────────────────────────────────────────
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    fs.renameSync(tempFilePath, outputPath);
    cleanupStateFile(stateFilePath);

    console.log(colors.success("✅ Download completed!"));
    console.log(colors.primary("📁 Saved to: ") + chalk.underline(outputPath));
    console.log(colors.purple("📊 Total: ") + formatBytes(downloaded));
    if (resuming) {
      console.log(colors.info("🔄 Resumed from: ") + formatBytes(startByte));
      console.log(colors.info("📥 This session: ") + formatBytes(sessionDl));
    }
    const emojis = ["🥳", "🎊", "🎈", "🌟", "💯", "🚀", "✨", "🔥"];
    console.log(
      colors.success(
        `${emojis[Math.floor(Math.random() * emojis.length)]} Done!`,
      ),
    );
  } catch (e: any) {
    if (ctx.progressBar) ctx.progressBar.stop();
    console.error(
      colors.error.bold("💥 Download failed: ") + colors.warning(e.message),
    );
    console.log(
      e.name === "AbortError"
        ? colors.info("💾 State saved. Run the same command to resume.")
        : colors.info("💾 Partial download saved. Restart to resume."),
    );
    throw e;
  }
}
