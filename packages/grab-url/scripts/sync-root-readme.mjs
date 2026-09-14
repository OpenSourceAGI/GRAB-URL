/**
 * @file sync-root-readme.mjs
 * @description Copies `packages/grab-url/README.md` to the repo root, so the
 * page GitHub shows for the monorepo is the one npm shows for the package.
 * The package copy is the single source of truth — edit that, not the root.
 * Run via `npm run make:readme`, which `npm run make` calls. Pass `--check` to
 * fail instead of writing when the root copy is stale.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");

const SOURCE = resolve(packageRoot, "README.md");
const TARGET = resolve(repoRoot, "README.md");

const NOTICE =
  "<!-- Copied from packages/grab-url/README.md by " +
  "packages/grab-url/scripts/sync-root-readme.mjs — edit that file, not this one. -->\n\n";

const expected = NOTICE + readFileSync(SOURCE, "utf8");
const current = (() => {
  try {
    return readFileSync(TARGET, "utf8");
  } catch {
    return null;
  }
})();

if (current === expected) {
  console.log(`README.md is up to date with ${relative(repoRoot, SOURCE)}`);
  process.exit(0);
}

if (process.argv.includes("--check")) {
  console.error(
    `README.md is stale. Run \`npm run make:readme\` in ${relative(repoRoot, packageRoot)}.`,
  );
  process.exit(1);
}

writeFileSync(TARGET, expected, "utf8");
console.log(`Wrote README.md from ${relative(repoRoot, SOURCE)}`);
