/**
 * @file sync-runtime-support.mjs
 * @description Regenerates the docs page for the runtime support matrix from
 * the repo-root RUNTIME_SUPPORT.md, so the versioned contract has one source.
 * Run via `npm run make:runtime`, which `npm run make` calls before the docs
 * build. Pass `--check` to fail instead of writing when it is stale — CI does.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SOURCE = resolve(repoRoot, "RUNTIME_SUPPORT.md");
const PAGE = resolve(repoRoot, "apps/grab-help-docs/content/docs/runtime-support.mdx");

const source = readFileSync(SOURCE, "utf8").replace(/\r\n/g, "\n").trimEnd();

// The H1 becomes the page title; Fumadocs renders the title itself.
const [, title, rest] = source.match(/^# (.+)\n+([\s\S]*)$/) ?? [];
if (!title) {
  console.error("✗ RUNTIME_SUPPORT.md must start with a `# Title` line.");
  process.exit(1);
}

// MDX reads a bare `<` or `{` in prose as JSX. Outside code they would break
// the docs build, so refuse them here with the line to fix.
let inFence = false;
for (const [i, line] of rest.split("\n").entries()) {
  if (line.trimStart().startsWith("```")) inFence = !inFence;
  if (inFence) continue;
  if (/[<{]/.test(line.replace(/`[^`]*`/g, ""))) {
    console.error(`✗ RUNTIME_SUPPORT.md: bare < or { outside code would break MDX:\n  ${line}`);
    process.exit(1);
  }
}

const page = `---
title: ${title}
description: What grab() needs from each runtime, what CI verifies there, and the behavior every release guarantees.
icon: ShieldCheck
---

{/* Generated from RUNTIME_SUPPORT.md by packages/grab-url/scripts/sync-runtime-support.mjs — edit that file, not this one. */}

${rest}
`;

const current = (() => {
  try {
    return readFileSync(PAGE, "utf8");
  } catch {
    return "";
  }
})();

if (current === page) {
  console.log("✓ runtime-support.mdx is in sync with RUNTIME_SUPPORT.md");
  process.exit(0);
}

if (process.argv.includes("--check")) {
  console.error("✗ runtime-support.mdx is out of date with RUNTIME_SUPPORT.md — run `npm run make:runtime`");
  process.exit(1);
}

writeFileSync(PAGE, page);
console.log("✓ Wrote grab-help-docs/content/docs/runtime-support.mdx from RUNTIME_SUPPORT.md");
