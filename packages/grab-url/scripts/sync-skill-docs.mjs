/**
 * @file sync-skill-docs.mjs
 * @description Regenerates the docs page for the agent skill from the skill
 * itself, so `skills/use-grab-request/SKILL.md` stays the single source of
 * truth. Run via `npm run make:skill`, which `npm run make` calls before the
 * docs build. Pass `--check` to fail instead of writing when it is stale.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = resolve(root, "skills/use-grab-request/SKILL.md");
const PAGE = resolve(root, "grab-help-docs/content/docs/claude-skill.mdx");

const HEADER = `---
title: Claude Skill & AI Code Editors
icon: Bot
---

{/* Generated from skills/use-grab-request/SKILL.md by scripts/sync-skill-docs.mjs — edit the skill, not this file. */}

**Install in one command** into any agent (Claude, Cursor, Gemini, Codex, Antigravity, etc.):

\`\`\`bash
npx skills add vtempest/GRAB-URL@use-grab-request
\`\`\`

Or copy the markdown below and paste into \`~/.claude/skills/use-grab-request/SKILL.md\` (or your agent's equivalent path).

`;

const skill = readFileSync(SKILL, "utf8").replace(/\r\n/g, "\n").trimEnd();

if (skill.includes("\n````")) {
  console.error(
    "✗ SKILL.md contains a 4-backtick fence, which would break the docs code block.",
  );
  process.exit(1);
}

const page = `${HEADER}\`\`\`\`markdown\n${skill}\n\`\`\`\`\n`;
const current = (() => {
  try {
    return readFileSync(PAGE, "utf8");
  } catch {
    return "";
  }
})();

if (current === page) {
  console.log("✓ claude-skill.mdx is in sync with SKILL.md");
  process.exit(0);
}

if (process.argv.includes("--check")) {
  console.error(
    "✗ claude-skill.mdx is out of date with SKILL.md — run `npm run make:skill`",
  );
  process.exit(1);
}

writeFileSync(PAGE, page);
console.log("✓ Wrote grab-help-docs/content/docs/claude-skill.mdx from SKILL.md");
