/**
 * @file grab-url.ts
 * @description CLI entry point for grab-url. Supports API requests, file
 * downloads, SFTP / BitTorrent / magnet transfers (via aria2c), and detached
 * background jobs.
 *
 * Usage:
 *   npx grab-url <url> [options]
 *   npx grab-url https://api.example.com/data
 *   npx grab-url https://example.com/file.zip
 *   npx grab-url sftp://user@host/path/file.iso
 *   npx grab-url "magnet:?xt=urn:btih:..." --background
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { spawnSync, type ChildProcess } from "child_process";

import chalk from "chalk";
import Table from "cli-table3";

import { ArgParser, isFileUrl } from "./cli-args.js";
import { MultiColorFileDownloaderCLI } from "./file-downloader.js";
import {
  classifyAria2Target,
  isAria2Target,
  runAria2Transfer,
} from "./transfer/aria2-transfer.js";
import { isYtDlpTarget, runYtDlpTransfer } from "./transfer/ytdlp-transfer.js";
import {
  detachToBackground,
  isBackgroundChild,
  printJobs,
  promptYesNo,
  reportDetached,
} from "./background.js";
import { colors } from "./display/progress-format.js";
import { archivePage, reportArchive } from "./page/archive-page.js";
import { getStateDirectory } from "./transfer/resume-state.js";
import { isCancelInProgress, setCancelInProgress } from "./cancel-state.js";
import grab, { log } from "../../grab-api/src/index.js";

// ─── Library re-exports (for programmatic use) ──────────────────────────────
export { MultiColorFileDownloaderCLI } from "./file-downloader.js";
export type { Download } from "./file-downloader.js";
export {
  isValidUrl,
  generateFilename,
  getFileExtension,
} from "./keyboard-controls.js";
export { ArgParser, isFileUrl } from "./cli-args.js";
export {
  classifyAria2Target,
  isAria2Target,
  buildAria2Args,
  parseAria2Progress,
  parseAria2Size,
  parseAria2Eta,
  findAria2,
  runAria2Transfer,
} from "./transfer/aria2-transfer.js";
export type { Aria2Kind, Aria2Options } from "./transfer/aria2-transfer.js";
export {
  MEDIA_DOMAINS,
  matchMediaDomain,
  isMediaDomain,
  hostnameOf,
} from "./transfer/media-domains.js";
export {
  isYtDlpTarget,
  describeYtDlpTarget,
  resolveYtDlpSite,
  buildYtDlpArgs,
  parseYtDlpProgress,
  parseYtDlpDestination,
  isYtDlpNoise,
  describeYtDlpExit,
  runYtDlpTransfer,
  YTDLP_PROGRESS_TEMPLATE,
} from "./transfer/ytdlp-transfer.js";
export { runYtDlpDownload } from "./transfer/ytdlp-transfer.js";
export type {
  YtDlpMetadata,
  YtDlpOptions,
  YtDlpProgress,
} from "./transfer/ytdlp-transfer.js";
export {
  findYtDlp,
  probeYtDlp,
  ytDlpInstallHint,
  ytDlpExecutableName,
  ytDlpBinaryNames,
  hostTargetTriple,
  managedBinDirectory,
  bundledSearchDirectories,
} from "./transfer/ytdlp-binary.js";
export type { YtDlpBinary } from "./transfer/ytdlp-binary.js";
export {
  detachToBackground,
  buildChildArgv,
  isBackgroundChild,
  listJobs,
  printJobs,
  promptYesNo,
} from "./background.js";
export type { JobRecord } from "./background.js";
export { isCancelInProgress, setCancelInProgress } from "./cancel-state.js";
export { archivePage, reportArchive, ARCHIVE_FILES } from "./page/archive-page.js";
export type { ArchivePageOptions, ArchivePageResult } from "./page/archive-page.js";
export {
  titleToFolderName,
  urlToFolderName,
  resolveFolderName,
  MAX_FOLDER_NAME,
} from "./page/folder-name.js";
export {
  escapeHTML,
  wrapDocument,
  buildApaCite,
  buildCiteDocument,
  buildContentDocument,
  buildTranscriptDocument,
} from "./page/archive-html.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Run CLI only when executed directly (not when imported as a module)
const __isMain =
  (typeof import.meta.main === "boolean" && import.meta.main) ||
  (() => {
    try {
      const scriptArg = process.argv[1] ? path.resolve(process.argv[1]) : "";
      if (!scriptArg) return false;
      return import.meta.url === pathToFileURL(scriptArg).href;
    } catch {
      return false;
    }
  })();

if (__isMain) {
  const argv = new ArgParser()
    .usage("Usage: grab-url <url...> [options]")
    .command("$0 <url>", "Fetch data, download files, or transfer sftp/torrent/magnet")
    .option("no-save", {
      type: "boolean",
      default: false,
      describe: "Don't save output to file, just print to console",
    })
    .option("output", {
      alias: "o",
      type: "string",
      describe: "Output filename (default: output.json)",
      default: null,
    })
    .option("params", {
      alias: "p",
      type: "string",
      describe: 'JSON string of query parameters (e.g., \'{"key":"value"}\')',
      coerce: (arg: string) => {
        if (!arg) return {};
        try {
          return JSON.parse(arg);
        } catch {
          throw new Error(`Invalid JSON in params: ${arg}`);
        }
      },
    })
    .option("page", {
      alias: "P",
      type: "boolean",
      default: false,
      describe:
        "Archive each URL into a folder named after its title: page, content, cite, transcript, video",
    })
    .option("no-video", {
      type: "boolean",
      default: false,
      describe: "With --page, skip the yt-dlp video download",
    })
    .option("video-format", {
      type: "string",
      default: null,
      describe: "With --page, format selector passed to yt-dlp -f (e.g. bestvideo+bestaudio)",
    })
    .option("lang", {
      type: "string",
      default: null,
      describe:
        "With --page, comma-separated transcript languages, most preferred first (default: en)",
    })
    .option("background", {
      alias: "b",
      type: "boolean",
      default: false,
      describe: "Detach and transfer in the background, logging to a file",
    })
    .option("jobs", {
      type: "boolean",
      default: false,
      standalone: true,
      describe: "List background transfers still running, then exit",
    })
    .option("log", {
      type: "string",
      default: null,
      describe: "Log file for background transfers (default: <state-dir>/logs)",
    })
    .option("no-bg-prompt", {
      type: "boolean",
      default: false,
      describe: "On Ctrl+C, cancel immediately instead of offering background",
    })
    .option("dir", {
      alias: "d",
      type: "string",
      default: null,
      describe: "Destination directory for downloads and sftp/torrent/magnet",
    })
    .option("seed", {
      type: "boolean",
      default: false,
      describe: "Keep seeding a torrent after it completes",
    })
    .option("connections", {
      alias: "c",
      type: "number",
      default: 8,
      describe: "Connections per server for sftp transfers (1-16)",
    })
    .option("user", {
      type: "string",
      default: null,
      describe: "Username for sftp transfers",
    })
    .option("password", {
      type: "string",
      default: null,
      describe: "Password for sftp transfers",
    })
    .option("ssh-host-key", {
      type: "string",
      default: null,
      describe: "Expected sftp host key digest, e.g. sha-1=b030503...",
    })
    .option("aria2-args", {
      type: "string",
      default: null,
      greedy: true,
      describe: "Extra space-separated flags passed straight to aria2c",
    })
    .option("no-ytdlp", {
      type: "boolean",
      default: false,
      describe: "Never use yt-dlp — fetch media-site URLs as plain pages",
    })
    .option("ytdlp", {
      type: "boolean",
      default: false,
      describe: "Force every URL through yt-dlp, even off the known-site list",
    })
    .option("install-ytdlp", {
      type: "boolean",
      default: false,
      standalone: true,
      describe: "Download the yt-dlp binary for this machine, then exit",
    })
    .option("format", {
      alias: "f",
      type: "string",
      default: null,
      describe: "yt-dlp format selector, e.g. bestvideo+bestaudio or 137",
    })
    .option("audio", {
      alias: "a",
      type: "string",
      default: null,
      describe: "Extract audio only, in this container (mp3, m4a, opus, best)",
    })
    .option("playlist", {
      type: "boolean",
      default: false,
      describe: "Download the whole playlist, not just the linked item",
    })
    .option("cookies-from-browser", {
      type: "string",
      default: null,
      describe: "Read cookies from a browser (chrome, firefox, …) for gated media",
    })
    .option("ytdlp-args", {
      type: "string",
      default: null,
      greedy: true,
      describe: "Extra space-separated flags passed straight to yt-dlp",
    })
    .option("grab-background-child", {
      type: "boolean",
      default: false,
      hidden: true,
      describe: "Internal: marks a detached background process",
    })
    .help()
    .alias("h", "help")
    .example(
      "grab-url https://api.example.com/data",
      "Fetch JSON/text from an API and save to output.json",
    )
    .example(
      "grab-url https://example.com/file1.zip https://example.com/file2.zip",
      "Download multiple files concurrently",
    )
    .example(
      "grab-url https://example.com/file.iso -o ubuntu.iso",
      "Save the first URL to a custom filename",
    )
    .example(
      "grab-url sftp://user@host/srv/backup.tar.gz --password hunter2",
      "Pull a file over SFTP with aria2c",
    )
    .example(
      'grab-url "magnet:?xt=urn:btih:HASH" -d ./downloads',
      "Download a magnet link into ./downloads",
    )
    .example(
      "grab-url https://example.com/big.iso --background",
      "Detach immediately and keep downloading in the background",
    )
    .example(
      "grab-url https://www.youtube.com/watch?v=VIDEO_ID",
      "Media sites are detected by domain and downloaded with yt-dlp",
    )
    .example(
      "grab-url https://soundcloud.com/artist/track -a mp3",
      "Extract audio only from any supported media site",
    )
    .example("grab-url --jobs", "List background transfers that are still running")
    .version("1.2.0")
    .strict()
    .parseSync();

  const urls: string[] = argv.urls || [];
  const params: Record<string, any> = argv.params || {};
  const outputFile: string | null = argv.output;
  const noSave: boolean = argv["no-save"];

  // Path only — the state directory is created by whichever transfer needs it,
  // so a plain API request leaves no .grab-downloads behind.
  const stateDir = getStateDirectory();

  let downloaderInstance: MultiColorFileDownloaderCLI | null = null;
  /** Build the downloader on first use and wire up its Ctrl+C handler. */
  const getDownloader = () => {
    if (!downloaderInstance) {
      downloaderInstance = new MultiColorFileDownloaderCLI();
      downloaderInstance.setCancelHandler(handleCancel);
    }
    return downloaderInstance;
  };

  // --- yt-dlp installation (no URL needed) ---
  if (argv["install-ytdlp"]) {
    // dist/grab-url-cli.es.js and packages/grab-url-cli/src/index.ts sit at
    // different depths, so look for the script from both.
    const installer = [
      path.resolve(__dirname, "..", "scripts", "install-yt-dlp.mjs"),
      path.resolve(__dirname, "..", "..", "grab-url", "scripts", "install-yt-dlp.mjs"),
    ].find((candidate) => fs.existsSync(candidate));

    if (!installer) {
      console.error(
        colors.error.bold("❌ install-yt-dlp.mjs is missing from this install."),
      );
      process.exit(1);
    }
    const result = spawnSync(process.execPath, [installer, "--force"], {
      stdio: "inherit",
    });
    process.exit(result.status ?? 1);
  }

  // --- Background job listing (no URL needed) ---
  if (argv.jobs) {
    printJobs(stateDir);
    process.exit(0);
  }

  // --- Detach up front when --background was passed ---
  if (argv.background && !isBackgroundChild()) {
    const handoff = detachToBackground({
      stateDir,
      urls,
      logFile: argv.log,
      reason: "flag",
    });
    if (!handoff) process.exit(1);
    reportDetached(handoff);
    process.exit(0);
  }

  // Split targets three ways: aria2c handles sftp / torrent / magnet, yt-dlp
  // handles pages on known media sites, and fetch() handles everything else.
  const aria2Targets = urls.filter(isAria2Target);
  const httpTargets = urls.filter((url) => !isAria2Target(url));

  // --no-ytdlp is the explicit opt-out, so it wins over --ytdlp.
  const ytdlpDisabled: boolean = argv["no-ytdlp"];
  const ytdlpForced: boolean = argv.ytdlp && !ytdlpDisabled;
  const mediaTargets = ytdlpDisabled
    ? []
    : httpTargets.filter((url) => ytdlpForced || isYtDlpTarget(url));
  const webUrls = httpTargets.filter((url) => !mediaTargets.includes(url));

  const anyFileUrl = webUrls.some(isFileUrl);
  const isDownloadMode = webUrls.length > 1 || anyFileUrl;

  const aria2Options = {
    dir: argv.dir ? path.resolve(argv.dir) : process.cwd(),
    output: outputFile,
    seed: !!argv.seed,
    connections: Number(argv.connections) || 8,
    user: argv.user,
    password: argv.password,
    sshHostKey: argv["ssh-host-key"],
    extraArgs:
      typeof argv["aria2-args"] === "string"
        ? argv["aria2-args"].split(" ").filter(Boolean)
        : [],
  };

  const ytdlpOptions = {
    dir: argv.dir ? path.resolve(argv.dir) : process.cwd(),
    output: outputFile,
    format: argv.format,
    audioFormat: argv.audio,
    playlist: !!argv.playlist,
    cookiesFromBrowser: argv["cookies-from-browser"],
    extraArgs:
      typeof argv["ytdlp-args"] === "string"
        ? argv["ytdlp-args"].split(" ").filter(Boolean)
        : [],
  };

  // ── Cancellation: offer to keep the transfer running in the background ──────
  // aria2c and yt-dlp never run at the same time, so one handle covers both.
  let transferChild: ChildProcess | null = null;
  let cancelling = false;

  /** Stop in-flight transfers so a background handoff can take over the files. */
  const stopTransfers = async () => {
    if (transferChild && !transferChild.killed) {
      const child = transferChild;
      // SIGINT lets the engine flush its resume state — aria2c's .aria2 control
      // file, yt-dlp's .part file — so the next run picks up where this stopped.
      const exited = new Promise<void>((resolve) => {
        child.once("close", () => resolve());
        setTimeout(resolve, 5000);
      });
      try {
        child.kill("SIGCONT");
        child.kill("SIGINT");
      } catch {
        /* already gone */
      }
      await exited;
    }
    downloaderInstance?.cleanup();
    // Give the write streams a beat to flush before another process appends.
    await new Promise((r) => setTimeout(r, 300));
  };

  const handleCancel = async () => {
    if (cancelling) return;
    cancelling = true;
    // Silences the abort-induced "failed" reporting in the transfer engines.
    setCancelInProgress(true);

    const canPrompt = process.stdin.isTTY && !argv["no-bg-prompt"];
    const keepGoing = canPrompt
      ? await promptYesNo("🛑 Cancel — keep transferring in the background?", true)
      : false;

    await stopTransfers();

    if (keepGoing) {
      const handoff = detachToBackground({
        stateDir,
        urls,
        logFile: argv.log,
        reason: "cancel",
      });
      if (handoff) {
        reportDetached(handoff);
        process.exit(0);
      }
    }

    console.log(colors.warning.bold("\n🛑 Transfer cancelled by user"));
    console.log(
      colors.info("💾 Partial progress saved. Run the same command to resume."),
    );
    process.exit(130);
  };

  if (!process.stdin.isTTY) process.on("SIGINT", () => void handleCancel());

  (async () => {
    // --- Page Archive Mode: one folder per URL, named after its title ---
    if (argv.page) {
      const languages: string[] = (argv.lang || "")
        .split(",")
        .map((code: string) => code.trim())
        .filter(Boolean);

      let failures = 0;
      for (const url of webUrls) {
        try {
          reportArchive(
            await archivePage(url, {
              dir: argv.dir,
              folderName: webUrls.length === 1 ? outputFile : null,
              skipVideo: argv["no-video"],
              videoFormat: argv["video-format"],
              languages,
            }),
          );
        } catch (error: any) {
          failures++;
          console.error(
            colors.error.bold("💥 Could not archive ") +
              colors.warning(`${url}: ${error.message}`),
          );
        }
      }
      if (aria2Targets.length) {
        console.log(
          colors.warning(
            `⚠ --page only archives web pages; ignored ${aria2Targets.length} sftp/torrent/magnet target(s)`,
          ),
        );
      }
      // Nothing archivable at all is a failure, not a silent success.
      process.exit(failures > 0 || !webUrls.length ? 1 : 0);
    }

    // --- aria2c Mode: sftp / torrent / magnet ---
    let aria2Failures = 0;
    for (const target of aria2Targets) {
      const kind = classifyAria2Target(target)!;
      const downloader = getDownloader();
      downloader.setupGlobalKeyboardListener();
      try {
        await runAria2Transfer(target, aria2Options, {
          isPaused: () => downloader.isPaused,
          onChild: (child) => {
            transferChild = child;
          },
        });
      } catch (error: any) {
        if (isCancelInProgress()) return;
        aria2Failures++;
        console.error(
          colors.error.bold(`💥 ${kind} transfer failed: `) +
            colors.warning(error.message),
        );
      }
    }
    // --- yt-dlp Mode: pages on known media sites ---
    let ytdlpFailures = 0;
    for (const target of mediaTargets) {
      const downloader = getDownloader();
      downloader.setupGlobalKeyboardListener();
      try {
        await runYtDlpTransfer(target, ytdlpOptions, {
          isPaused: () => downloader.isPaused,
          onChild: (child) => {
            transferChild = child;
          },
        });
      } catch (error: any) {
        if (isCancelInProgress()) return;
        ytdlpFailures++;
        console.error(
          colors.error.bold("💥 media download failed: ") +
            colors.warning(error.message),
        );
      }
    }

    const externalTargets = aria2Targets.length + mediaTargets.length;
    if (externalTargets && !webUrls.length) {
      downloaderInstance?.cleanup();
      process.exit(aria2Failures + ytdlpFailures > 0 ? 1 : 0);
    }

    if (isDownloadMode) {
      // --- Download Mode ---
      const downloader = getDownloader();
      const targetDir = argv.dir ? path.resolve(argv.dir) : process.cwd();
      const downloadObjects = webUrls.map((url, i) => {
        let filename =
          i === 0 && outputFile ? outputFile : downloader.generateFilename(url, targetDir);
        const outputPath = path.isAbsolute(filename)
          ? filename
          : path.join(targetDir, filename);
        const outputDir = path.dirname(outputPath);
        try {
          if (!fs.existsSync(outputDir))
            fs.mkdirSync(outputDir, { recursive: true });
        } catch (error: any) {
          console.error(
            chalk.red.bold("❌ Could not create output directory: ") +
              error.message,
          );
          process.exit(1);
        }
        return { url, outputPath, filename: path.basename(filename) };
      });

      try {
        await downloader.downloadMultipleFiles(downloadObjects);
        if (isCancelInProgress()) return;

        // Display file stats table
        const statsTable = new Table({
          head: ["Filename", "Size", "Created"],
          colWidths: [32, 14, 25],
          colAligns: ["left", "right", "left"],
          style: {
            "padding-left": 1,
            "padding-right": 1,
            head: [],
            border: [],
          },
        });

        downloadObjects.forEach((obj) => {
          try {
            const stats = fs.statSync(obj.outputPath);
            statsTable.push([
              obj.filename,
              downloader.formatBytes(stats.size),
              stats.birthtime.toLocaleString(),
            ]);
          } catch {
            statsTable.push([obj.filename, "Error", "Could not read"]);
          }
        });

        console.log(chalk.cyan.bold("\nFile Details:"));
        console.log(statsTable.toString());
      } catch (error: any) {
        if (isCancelInProgress()) return;
        console.error(
          chalk.red.bold("Failed to download files: ") +
            chalk.yellow(error.message),
        );
        process.exit(1);
      }
      downloader.cleanup();
    } else {
      // --- API Mode ---
      const url = webUrls[0];
      const startTime = process.hrtime();

      try {
        const res = await grab(url, params);
        if (res.error) log(`\n\nStatus: ❌ ${res.error}`);

        let filePath: string | null = null;
        let outputData: any;
        let isTextData = false;

        if (typeof res.data === "string") {
          outputData = res.data;
          isTextData = true;
        } else if (
          Buffer.isBuffer(res.data) ||
          res.data instanceof Uint8Array
        ) {
          outputData = res.data;
          isTextData = false;
        } else if (res.data instanceof Blob) {
          outputData = Buffer.from(await res.data.arrayBuffer());
          isTextData = false;
        } else if (res.data && typeof res.data === "object") {
          outputData = JSON.stringify(res.data, null, 2);
          isTextData = true;
        } else {
          outputData = String(res.data);
          isTextData = true;
        }

        if (!noSave) {
          const urlPath = new URL(url).pathname;
          const urlExt = path.extname(urlPath);
          const defaultExt = isTextData ? ".json" : urlExt || ".bin";
          filePath = outputFile
            ? path.resolve(outputFile)
            : path.resolve(process.cwd(), `output${defaultExt}`);

          if (isTextData) fs.writeFileSync(filePath, outputData, "utf8");
          else fs.writeFileSync(filePath, outputData);

          const [seconds, nanoseconds] = process.hrtime(startTime);
          const elapsedMs = (seconds + nanoseconds / 1e9).toFixed(2);
          const stats = fs.statSync(filePath);
          const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);
          log(`⏱️ ${elapsedMs}s 📦 ${fileSizeMB}MB ✅ Saved to: ${filePath}`);
        } else {
          if (isTextData) log(outputData);
          else
            log(
              `Binary data received (${outputData.length} bytes). Use --output to save to file.`,
            );
        }
      } catch (error: any) {
        log(`Error: ${error.message}`, { color: "red" });
        process.exit(1);
      }
    }
  })();
}
