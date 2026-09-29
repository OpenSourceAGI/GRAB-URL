#!/usr/bin/env node
/**
 * `npx grab-url <url>` — a launcher, not the CLI.
 *
 * The transfer CLI is published as `grab-url-cli` so that importing the
 * `grab-url` library never costs a consumer chalk, cli-table3, cli-progress or
 * a yt-dlp postinstall. This file is the only thing the library adds for the
 * command line: it is not part of the Vite build, imports nothing but Node
 * builtins, and hands off to `grab-url-cli` —
 *
 *   1. the copy already installed next to this package, when there is one;
 *   2. otherwise `npx grab-url-cli`, which fetches it on first use.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";

const CLI_PACKAGE = "grab-url-cli";
const CLI_BIN = "grab-url";
const args = process.argv.slice(2);

/** Absolute path to an installed grab-url-cli's `grab-url` bin, or null. */
function findInstalledCli() {
  try {
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve(`${CLI_PACKAGE}/package.json`);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.[CLI_BIN];
    if (!bin) return null;
    // The CLI only runs when argv[1] is its own real path, so resolve links.
    return realpathSync(resolve(dirname(pkgPath), bin));
  } catch {
    return null;
  }
}

function run(command, commandArgs, options = {}) {
  const child = spawn(command, commandArgs, { stdio: "inherit", ...options });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("error", (error) => {
    console.error(`grab-url: could not start ${CLI_PACKAGE}: ${error.message}`);
    console.error(`Install it with: npm i -g ${CLI_PACKAGE}`);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  });
}

const installed = findInstalledCli();
if (installed) {
  run(process.execPath, [installed, ...args]);
} else {
  // `grab-url-cli` has several bins and none named after the package, so the
  // bin to run has to be named explicitly.
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  run(npx, ["--yes", "--package", CLI_PACKAGE, "--", CLI_BIN, ...args], {
    shell: process.platform === "win32",
  });
}
