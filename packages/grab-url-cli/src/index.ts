/**
 * @file grab-url.ts
 * @description CLI entry point for grab-url. Supports API requests and file downloads.
 *
 * Usage:
 *   npx grab-url <url> [options]
 *   npx grab-url https://api.example.com/data
 *   npx grab-url https://example.com/file.zip
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import chalk from "chalk";
import Table from "cli-table3";

import { ArgParser, isFileUrl } from "./cli-args.js";
import { MultiColorFileDownloaderCLI } from "./file-downloader.js";
import grab, { log } from "../grab-api/index.js";

// ─── Library re-exports (for programmatic use) ──────────────────────────────
export { MultiColorFileDownloaderCLI } from "./file-downloader.js";
export type { Download } from "./file-downloader.js";
export {
  isValidUrl,
  generateFilename,
  getFileExtension,
} from "./keyboard-controls.js";
export { ArgParser, isFileUrl } from "./cli-args.js";

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
    .command("$0 <url>", "Fetch data or download files; pass one or more URLs")
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
    .version("1.1.0")
    .strict()
    .parseSync();

  const urls: string[] = argv.urls || [];
  const params: Record<string, any> = argv.params || {};
  const outputFile: string | null = argv.output;
  const noSave: boolean = argv["no-save"];

  // Detect mode: download if any URL looks like a file, or multiple URLs provided
  const anyFileUrl = urls.some(isFileUrl);
  const isDownloadMode = urls.length > 1 || anyFileUrl;

  (async () => {
    if (isDownloadMode) {
      // --- Download Mode ---
      const downloader = new MultiColorFileDownloaderCLI();

      const downloadObjects = urls.map((url, i) => {
        let filename =
          i === 0 && outputFile ? outputFile : downloader.generateFilename(url, process.cwd());
        const outputPath = path.isAbsolute(filename)
          ? filename
          : path.join(process.cwd(), filename);
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
        console.error(
          chalk.red.bold("Failed to download files: ") +
            chalk.yellow(error.message),
        );
        process.exit(1);
      }
      downloader.cleanup();
    } else {
      // --- API Mode ---
      const url = urls[0];
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
