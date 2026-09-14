/**
 * @file build-static-pages.mjs
 * @description Prunes server-only files, then runs `next build` as a static export.
 *
 * The docs are a full Next.js app: the deployment behind https://grab.js.org runs
 * middleware, a Server Action and a POST route handler. `output: 'export'` supports
 * none of those and fails the build when it finds them, so the GitHub Pages copy is
 * produced by removing them first. Nothing here runs during a normal `next build`.
 *
 * Destructive by design -- it edits the working tree, so it refuses to run outside CI
 * unless you pass --force (use a throwaway checkout if you do).
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Server-only files a static export cannot keep, and why. */
const REMOVE = [
  ['proxy.ts', 'middleware: rewrites /docs/<slug>.mdx to the llms.mdx route'],
  ['app/api', 'POST route handler: batches npm registry lookups'],
];

/** Files replaced by a static-safe stand-in rather than deleted. */
const REPLACE = [['app/actions.ts', 'scripts/static-export/actions.ts', 'Server Action: remote repo analysis']];

if (!process.env.CI && !process.argv.includes('--force')) {
  console.error(
    'build-static-pages.mjs rewrites the working tree and is meant for CI.\n' +
      'Re-run with --force from a throwaway checkout if that is what you want.',
  );
  process.exit(1);
}

for (const [target, why] of REMOVE) {
  const path = join(docsDir, target);
  if (!existsSync(path)) {
    throw new Error(`Expected to prune ${target} but it is missing -- has the app moved? (${why})`);
  }
  rmSync(path, { force: true, recursive: true });
  console.log(`pruned   ${target}  (${why})`);
}

for (const [target, stub, why] of REPLACE) {
  const path = join(docsDir, target);
  if (!existsSync(path)) {
    throw new Error(`Expected to replace ${target} but it is missing -- has the app moved? (${why})`);
  }
  copyFileSync(join(docsDir, stub), path);
  console.log(`stubbed  ${target}  (${why})`);
}

execFileSync('npx', ['next', 'build'], {
  cwd: docsDir,
  env: { ...process.env, DOCS_STATIC_EXPORT: '1' },
  stdio: 'inherit',
});
