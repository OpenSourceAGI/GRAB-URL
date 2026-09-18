/**
 * @file packaging.test.ts
 * @description Guards the shape of what `grab-url` publishes.
 *
 * Three promises are easy to make and easy to break silently:
 *
 *   1. `import grab from "grab-url"` is the **slim** build — no DOM parser, no
 *      unzipper, nothing lazily reachable from it either.
 *   2. `grab-url/full` is the one that carries linkedom and archiver-web.
 *   3. The CLI is a separate package. Nothing named `grab-url-cli` is inside
 *      the library's `dist/`, and the library declares no bin.
 *
 * Any of the three can be undone by a one-line edit to an entry list or an
 * import, with a green suite and no warning — hence this file.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const repoRoot = resolve(pkgRoot, '../..');
const dist = join(pkgRoot, 'dist');

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const grabUrlPkg = readJson(join(pkgRoot, 'package.json'));

/**
 * Walks a built entry's static and dynamic imports, returning every dist file
 * it can reach. A lazy `import()` counts: the bytes still ship, and a consumer
 * that triggers the code path still downloads them.
 */
function reachableFrom(entry: string): string[] {
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file) || !existsSync(join(dist, file))) return;
    seen.add(file);
    const code = readFileSync(join(dist, file), 'utf8');
    for (const [, target] of code.matchAll(/(?:from|import)\s*\(?["']\.\/([^"']+)["']/g)) {
      visit(target);
    }
  };
  visit(entry);
  return [...seen];
}

const bytesOf = (files: string[]) =>
  files.reduce((total, f) => total + statSync(join(dist, f)).size, 0);

// CI builds before it tests (see .github/workflows/tests.yml), so a missing
// dist there is a real failure. Locally it just means `npm run build` has not
// been run yet, and failing on that would be noise.
const built = existsSync(join(dist, 'grab-api-slim.es.js'));
const describeBuilt = built ? describe : process.env.CI ? describe : describe.skip;

// ─── the exports map ─────────────────────────────────────────────────────────

describe('grab-url exports map', () => {
  it('resolves the bare import to the slim build', () => {
    expect(grabUrlPkg.exports['.'].import).toBe('./dist/grab-api-slim.es.js');
    expect(grabUrlPkg.exports['.'].require).toBe('./dist/grab-api-slim.cjs.js');
    expect(grabUrlPkg.exports['.'].types).toBe('./dist/grab-api-slim.d.ts');
  });

  it('points main, module, types and the CDN fields at the same slim build', () => {
    expect(grabUrlPkg.main).toBe('./dist/grab-api-slim.cjs.js');
    expect(grabUrlPkg.module).toBe('./dist/grab-api-slim.es.js');
    expect(grabUrlPkg.types).toBe('./dist/grab-api-slim.d.ts');
    expect(grabUrlPkg.unpkg).toBe('dist/grab-api-slim.es.js');
    expect(grabUrlPkg.jsdelivr).toBe('dist/grab-api-slim.es.js');
  });

  it('exposes the DOM + zip build as grab-url/full', () => {
    expect(grabUrlPkg.exports['./full'].import).toBe('./dist/grab-api.es.js');
    expect(grabUrlPkg.exports['./full'].require).toBe('./dist/grab-api.cjs.js');
  });

  it('keeps grab-url/slim as an alias of the default, not a second copy', () => {
    // Same files means one module instance, so `grab.mock` registered through
    // either entry is visible to the other.
    expect(grabUrlPkg.exports['./slim']).toEqual(grabUrlPkg.exports['.']);
  });

  it('declares no runtime dependencies', () => {
    expect(grabUrlPkg.dependencies).toBeUndefined();
  });
});

// ─── the CLI lives somewhere else ────────────────────────────────────────────

describe('the CLI is packaged separately', () => {
  it('gives the library no bin and no ./cli export', () => {
    expect(grabUrlPkg.bin).toBeUndefined();
    expect(grabUrlPkg.exports['./cli']).toBeUndefined();
  });

  it('leaves the CLI-only dependencies out of the library', () => {
    const declared = {
      ...grabUrlPkg.dependencies,
      ...grabUrlPkg.peerDependencies,
    };
    for (const cliOnly of ['chalk', 'cli-table3', 'cli-progress', 'extract-webpage']) {
      expect(declared[cliOnly]).toBeUndefined();
    }
  });

  it('runs no postinstall — yt-dlp belongs to grab-url-cli', () => {
    expect(grabUrlPkg.scripts.postinstall).toBeUndefined();
  });

  it('publishes grab-url-cli as its own package with the three bins', () => {
    const cli = readJson(join(repoRoot, 'packages/grab-url-cli/package.json'));
    expect(cli.name).toBe('grab-url-cli');
    expect(cli.private).toBeUndefined();
    expect(Object.keys(cli.bin).sort()).toEqual(['g', 'grab', 'grab-url']);
    expect(cli.scripts.postinstall).toContain('install-yt-dlp.mjs');
  });
});

// ─── what each entry actually drags in ───────────────────────────────────────

describeBuilt('the built bundles', () => {
  const heavy = /linkedom|archiver|jszip|fflate|DOMParser/i;

  it('keeps the default entry free of the DOM parser and the unzipper', () => {
    const files = reachableFrom('grab-api-slim.es.js');
    const code = files.map((f) => readFileSync(join(dist, f), 'utf8')).join('\n');
    expect(code).not.toMatch(heavy);
  });

  it('keeps the default entry small', () => {
    // ~16 kB raw / ~7 kB gzipped today. The ceiling is there to catch a heavy
    // import sneaking in, not to police a few hundred bytes.
    expect(bytesOf(reachableFrom('grab-api-slim.es.js'))).toBeLessThan(30_000);
  });

  it('still gives grab-url/full the DOM parser and the unzipper', () => {
    const files = reachableFrom('grab-api.es.js');
    const code = files.map((f) => readFileSync(join(dist, f), 'utf8')).join('\n');
    expect(code).toMatch(/DOMParser|parseHTML/);
    expect(files.length).toBeGreaterThan(reachableFrom('grab-api-slim.es.js').length);
  });

  it('ships no CLI bundle inside the library dist', () => {
    const names = readdirSync(dist);
    expect(names.filter((n) => n.includes('grab-url-cli'))).toEqual([]);
    expect(names.filter((n) => n.startsWith('bin-'))).toEqual([]);
  });
});

// ─── the Hey API client ──────────────────────────────────────────────────────

describe('api2client stays a thin wrapper', () => {
  const api2clientRoot = join(repoRoot, 'packages/api2client');
  const pkg = readJson(join(api2clientRoot, 'package.json'));

  it('never bundles grab — every entry is external', () => {
    const config = readFileSync(join(api2clientRoot, 'vite.config.ts'), 'utf8');
    for (const entry of ['"grab-url"', '"grab-url/slim"', '"grab-url/full"']) {
      expect(config).toContain(entry);
    }
  });

  it('requires the grab-url major whose default import is slim', () => {
    expect(pkg.dependencies['grab-url']).toBe('^3.0.0');
  });

  const api2clientDist = join(api2clientRoot, 'dist/index.es.js');
  const api2clientBuilt = existsSync(api2clientDist);

  it.runIf(api2clientBuilt || process.env.CI)('builds to well under 100 kB', () => {
    const code = readFileSync(api2clientDist, 'utf8');
    expect(statSync(api2clientDist).size).toBeLessThan(100_000);
    // The import has to survive as an import — if grab were inlined the
    // generated SDK and the host app would end up with two `grab.mock`s.
    expect(code).toMatch(/from\s*["']grab-url(\/slim)?["']/);
  });
});
