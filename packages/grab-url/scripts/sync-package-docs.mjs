/**
 * @file sync-package-docs.mjs
 *
 * Copies the repository's README and licence into this package directory so
 * `npm pack`/`npm publish` ship them.
 *
 * `grab-url` is published from `packages/grab-url`, but both files
 * describe the whole project and stay at the repo root, where GitHub renders
 * them. npm only ever packs files from the package directory and has no way to
 * reach outside it, so a copy has to exist here at pack time. It is written by
 * `prepack` (which runs for both `npm pack` and `npm publish`) and gitignored,
 * so there is exactly one tracked source for each file and no drift.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageDir, "..", "..");

// npm always packs a README and a LICENSE it finds in the package directory,
// whatever `files` says, so these two need no `files` entry.
const DOCS = ["README.md", "LICENSE.md"];

mkdirSync(packageDir, { recursive: true });

for (const name of DOCS) {
  const from = join(repoRoot, name);
  if (!existsSync(from)) {
    console.warn(`⏭  ${name} is not at the repo root — skipping`);
    continue;
  }
  copyFileSync(from, join(packageDir, name));
  console.log(`📄 ${name} → packages/grab-url/${name}`);
}
