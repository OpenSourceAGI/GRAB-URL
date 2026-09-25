/**
 * @file packaging.test.ts
 * @description Guards the shape of what this repo publishes.
 *
 * Four promises are easy to make and easy to break silently:
 *
 *   1. `import grab from "grab-url"` is the **slim** build — no DOM parser, no
 *      unzipper, nothing lazily reachable from it either.
 *   2. `grab-url/full` is the one that carries linkedom and archiver-web.
 *   3. The CLI is a separate package. Nothing named `grab-url-cli` is inside
 *      the library's `dist/`, and the library declares no bin.
 *   4. `grab-api.js` publishes the same source under the same entry shape, and
 *      exports exactly the same names — the two must not drift.
 *
 * Any of them can be undone by a one-line edit to an entry list or an import,
 * with a green suite and no warning — hence this file.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const repoRoot = resolve(pkgRoot, '../..');
const dist = join(pkgRoot, 'dist');

const grabApiRoot = join(repoRoot, 'packages/grab-api');
const grabApiDist = join(grabApiRoot, 'dist');

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const grabUrlPkg = readJson(join(pkgRoot, 'package.json'));
const grabApiPkg = readJson(join(grabApiRoot, 'package.json'));

/**
 * Walks a built entry's static and dynamic imports, returning every dist file
 * it can reach. A lazy `import()` counts: the bytes still ship, and a consumer
 * that triggers the code path still downloads them.
 */
function reachableFrom(entry: string, distDir = dist): string[] {
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file) || !existsSync(join(distDir, file))) return;
    seen.add(file);
    const code = readFileSync(join(distDir, file), 'utf8');
    for (const [, target] of code.matchAll(/(?:from|import)\s*\(?["']\.\/([^"']+)["']/g)) {
      visit(target);
    }
  };
  visit(entry);
  return [...seen];
}

const bytesOf = (files: string[], distDir = dist) =>
  files.reduce((total, f) => total + statSync(join(distDir, f)).size, 0);

const sourceOf = (files: string[], distDir = dist) =>
  files.map((f) => readFileSync(join(distDir, f), 'utf8')).join('\n');

/**
 * The public names a built ES bundle exports, read off its final `export{…}`
 * statement. Terser renames the locals but never the exported names, so this
 * is the API surface a consumer sees.
 */
function exportedNames(file: string, distDir = dist): string[] {
  const code = readFileSync(join(distDir, file), 'utf8');
  const statements = [...code.matchAll(/\bexport\s*\{([^}]*)\}/g)];
  const names = statements.flatMap(([, body]) =>
    body
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => (part.includes(' as ') ? part.split(' as ')[1] : part).trim()),
  );
  return [...new Set(names)].sort();
}

// CI builds before it tests (see .github/workflows/tests.yml), so a missing
// dist there is a real failure. Locally it just means `npm run build` has not
// been run yet, and failing on that would be noise.
const built =
  existsSync(join(dist, 'grab-api-slim.es.js')) &&
  existsSync(join(grabApiDist, 'grab-api-slim.es.js'));
const describeBuilt = built ? describe : process.env.CI ? describe : describe.skip;

// ─── the exports map ─────────────────────────────────────────────────────────

describe('grab-url exports map', () => {
  it('resolves the bare import to the slim build', () => {
    expect(grabUrlPkg.exports['.'].import).toBe('./dist/grab-api-slim.es.js');
    expect(grabUrlPkg.exports['.'].require).toBe('./dist/grab-api-slim.cjs');
    expect(grabUrlPkg.exports['.'].types).toBe('./dist/grab-api-slim.d.ts');
  });

  it('points main, module, types and the CDN fields at the same slim build', () => {
    expect(grabUrlPkg.main).toBe('./dist/grab-api-slim.cjs');
    expect(grabUrlPkg.module).toBe('./dist/grab-api-slim.es.js');
    expect(grabUrlPkg.types).toBe('./dist/grab-api-slim.d.ts');
    expect(grabUrlPkg.unpkg).toBe('dist/grab-api-slim.es.js');
    expect(grabUrlPkg.jsdelivr).toBe('dist/grab-api-slim.es.js');
  });

  it('exposes the DOM + zip build as grab-url/full', () => {
    expect(grabUrlPkg.exports['./full'].import).toBe('./dist/grab-api.es.js');
    expect(grabUrlPkg.exports['./full'].require).toBe('./dist/grab-api.cjs');
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
    expect(sourceOf(reachableFrom('grab-api-slim.es.js'))).not.toMatch(heavy);
  });

  it('keeps the default entry small', () => {
    // ~16 kB raw / ~7 kB gzipped today. The ceiling is there to catch a heavy
    // import sneaking in, not to police a few hundred bytes.
    expect(bytesOf(reachableFrom('grab-api-slim.es.js'))).toBeLessThan(30_000);
  });

  it('still gives grab-url/full the DOM parser and the unzipper', () => {
    const files = reachableFrom('grab-api.es.js');
    expect(sourceOf(files)).toMatch(/DOMParser|parseHTML/);
    expect(files.length).toBeGreaterThan(reachableFrom('grab-api-slim.es.js').length);
  });

  it('ships no CLI bundle inside the library dist', () => {
    const names = readdirSync(dist);
    expect(names.filter((n) => n.includes('grab-url-cli'))).toEqual([]);
    expect(names.filter((n) => n.startsWith('bin-'))).toEqual([]);
  });
});

// ─── grab-api.js, the same core published on its own ─────────────────────────

describeBuilt('grab-api.js and grab-url do not drift', () => {
  const heavy = /linkedom|archiver|jszip|fflate|DOMParser/i;

  // Both packages name their entries the same; only the dist they sit in
  // differs, so every comparison below is grab-api.js's dist against
  // grab-url's.
  it('exports exactly the same names from both default entries', () => {
    expect(exportedNames('grab-api-slim.es.js', grabApiDist)).toEqual(
      exportedNames('grab-api-slim.es.js', dist),
    );
  });

  it('exports exactly the same names from both full entries', () => {
    expect(exportedNames('grab-api.es.js', grabApiDist)).toEqual(
      exportedNames('grab-api.es.js', dist),
    );
  });

  it('keeps its default entry free of the DOM parser and the unzipper', () => {
    const files = reachableFrom('grab-api-slim.es.js', grabApiDist);
    expect(sourceOf(files, grabApiDist)).not.toMatch(heavy);
    expect(bytesOf(files, grabApiDist)).toBeLessThan(30_000);
  });

  it('still gives grab-api.js/full the DOM parser and the unzipper', () => {
    const files = reachableFrom('grab-api.es.js', grabApiDist);
    expect(sourceOf(files, grabApiDist)).toMatch(/DOMParser|parseHTML/);
  });

  it('ships no spinner or icon bundle — those stay in grab-url', () => {
    const names = readdirSync(grabApiDist);
    expect(names.filter((n) => /animations|quantum-sphere|grab-url-cli/.test(n))).toEqual([]);
  });

  it('emits declarations that stay inside the tarball', () => {
    // vite-plugin-dts rewrites an aliased import using the alias target, so a
    // `.ts` on the alias ships `from './…/log-json.ts'` in the .d.ts — a file
    // the tarball does not contain, and an extension a consumer cannot import.
    // grab-api.js rolls its declarations up, so its entry sits at the dist
    // root; grab-url keeps the per-file tree.
    for (const [distDir, entry] of [
      [grabApiDist, 'grab-api-slim.d.ts'],
      [dist, 'grab-api/src/index.slim.d.ts'],
    ] as const) {
      const types = readFileSync(join(distDir, entry), 'utf8');
      expect(types).not.toMatch(/from\s*['"][^'"]+\.tsx?['"]/);
    }
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

// ─── grab-api.js ─────────────────────────────────────────────────────────────

/**
 * `grab-api.js` publishes the same `grab()` core as `grab-url`, without the
 * animations, the sphere or the CLI. It builds from its own vite config into
 * its own dist, so the two can drift — these checks are what stops the drift
 * from reaching npm.
 */
describe('grab-api.js publishes the core on its own', () => {
  const pkg = grabApiPkg;
  const apiDist = grabApiDist;

  it('is publishable, not a private workspace package', () => {
    expect(pkg.private).toBeUndefined();
    expect(pkg.name).toBe('grab-api.js');
    expect(pkg.publishConfig.access).toBe('public');
  });

  it('carries the metadata npm renders on the package page', () => {
    expect(pkg.description).toBeTruthy();
    expect(pkg.license).toBe(grabUrlPkg.license);
    expect(pkg.author).toBe(grabUrlPkg.author);
    expect(pkg.homepage).toBe(grabUrlPkg.homepage);
    expect(pkg.repository.directory).toBe('packages/grab-api');
    expect(pkg.keywords.length).toBeGreaterThan(10);
    expect(pkg.engines.node).toBe(grabUrlPkg.engines.node);
  });

  it('resolves the bare import to the slim build, same as grab-url', () => {
    expect(pkg.exports['.'].import).toBe('./dist/grab-api-slim.es.js');
    expect(pkg.exports['.'].require).toBe('./dist/grab-api-slim.cjs');
    expect(pkg.exports['.'].types).toBe('./dist/grab-api-slim.d.ts');
    expect(pkg.exports['./slim']).toEqual(pkg.exports['.']);
    expect(pkg.exports['./full'].import).toBe('./dist/grab-api.es.js');
  });

  it('declares no runtime dependencies and no bin', () => {
    expect(pkg.dependencies).toBeUndefined();
    expect(pkg.bin).toBeUndefined();
    expect(pkg.scripts.postinstall).toBeUndefined();
  });

  it('ships only the built output, never the source that imports @grab-url/log', () => {
    // `src/` resolves `@grab-url/log`, a private workspace package with no
    // dist. Shipped as-is it would be unresolvable in a consumer's install.
    expect(pkg.files).not.toContain('src');
    expect(pkg.files).toContain('dist');
  });

  it('builds from its own config, not grab-url\'s', () => {
    expect(pkg.scripts.build).toBe('vite build --config vite.config.ts');
    expect(existsSync(join(grabApiRoot, 'vite.config.ts'))).toBe(true);
  });

  const apiBuilt = existsSync(join(apiDist, 'grab-api-slim.es.js'));

  it.runIf(apiBuilt || process.env.CI)('emits self-contained declarations', () => {
    // Rolled up by api-extractor. Left unrolled, the emitted d.ts points at
    // `../../log-json/src/...` — a path outside the tarball.
    for (const types of ['grab-api-slim.d.ts', 'grab-api.d.ts']) {
      const dts = readFileSync(join(apiDist, types), 'utf8');
      expect(dts).not.toMatch(/from\s*["']\.\.\//);
      expect(dts).not.toMatch(/@grab-url\/log/);
    }
  });
});

// ─── CJS entries have to be require()-able ───────────────────────────────────

/**
 * Both packages are `"type": "module"`. Node reads *any* `.js` file under that
 * as ESM, so a CJS entry named `grab-api-slim.cjs.js` threw "exports is not
 * defined in ES module scope" on the first `require()` — the published 3.0.0
 * had no working CJS entry at all. The extension is the whole fix.
 */
describe('the CJS entries are named .cjs', () => {
  for (const [label, pkgPath, distDir] of [
    ['grab-url', 'packages/grab-url', join(repoRoot, 'packages/grab-url/dist')],
    ['grab-api.js', 'packages/grab-api', join(repoRoot, 'packages/grab-api/dist')],
  ] as const) {
    const pkg = readJson(join(repoRoot, pkgPath, 'package.json'));

    it(`${label} points every require condition at a .cjs file`, () => {
      expect(pkg.type).toBe('module');
      expect(pkg.main.endsWith('.cjs')).toBe(true);
      for (const [subpath, conditions] of Object.entries(pkg.exports)) {
        if (typeof conditions !== 'object' || conditions === null) continue;
        const require_ = (conditions as Record<string, string>).require;
        if (!require_) continue;
        expect(`${subpath}: ${require_}`).toMatch(/\.cjs$/);
      }
    });

    it.runIf(existsSync(distDir))(`${label} emits no .cjs.js file`, () => {
      expect(readdirSync(distDir).filter((n) => n.endsWith('.cjs.js'))).toEqual([]);
    });
  }
});
