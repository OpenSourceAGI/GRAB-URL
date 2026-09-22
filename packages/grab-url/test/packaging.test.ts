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
  existsSync(join(grabApiDist, 'index.slim.es.js'));
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

describe('grab-api.js is a publishable package', () => {
  it('is not private and carries what npm needs', () => {
    expect(grabApiPkg.private).toBeUndefined();
    expect(grabApiPkg.name).toBe('grab-api.js');
    expect(grabApiPkg.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(grabApiPkg.description).toBeTruthy();
    expect(grabApiPkg.license).toBe(grabUrlPkg.license);
    expect(grabApiPkg.repository.directory).toBe('packages/grab-api');
    expect(grabApiPkg.keywords.length).toBeGreaterThan(5);
    expect(grabApiPkg.files).toContain('dist');
    expect(grabApiPkg.publishConfig.access).toBe('public');
  });

  it('mirrors grab-url: slim by default, /full for DOM and zip', () => {
    expect(grabApiPkg.exports['.'].import).toBe('./dist/index.slim.es.js');
    expect(grabApiPkg.exports['./full'].import).toBe('./dist/index.es.js');
    expect(grabApiPkg.exports['./slim']).toEqual(grabApiPkg.exports['.']);
    expect(grabApiPkg.main).toBe('./dist/index.slim.cjs.js');
    expect(grabApiPkg.module).toBe('./dist/index.slim.es.js');
    expect(grabApiPkg.types).toBe('./dist/index.slim.d.ts');
    expect(grabApiPkg.unpkg).toBe('dist/index.slim.es.js');
  });

  it('declares no runtime dependencies and no bin', () => {
    expect(grabApiPkg.dependencies).toBeUndefined();
    expect(grabApiPkg.bin).toBeUndefined();
  });

  it('builds from its own config, not grab-url\'s', () => {
    // Sharing grab-url's config would emit the spinners and the sphere here
    // too — the whole point of this package is that it does not carry them.
    expect(grabApiPkg.scripts.build).toBe('vite build --config vite.config.ts');
    expect(existsSync(join(grabApiRoot, 'vite.config.ts'))).toBe(true);
  });
});

describeBuilt('grab-api.js and grab-url do not drift', () => {
  const heavy = /linkedom|archiver|jszip|fflate|DOMParser/i;

  it('exports exactly the same names from both default entries', () => {
    expect(exportedNames('index.slim.es.js', grabApiDist)).toEqual(
      exportedNames('grab-api-slim.es.js'),
    );
  });

  it('exports exactly the same names from both full entries', () => {
    expect(exportedNames('index.es.js', grabApiDist)).toEqual(exportedNames('grab-api.es.js'));
  });

  it('keeps its default entry free of the DOM parser and the unzipper', () => {
    const files = reachableFrom('index.slim.es.js', grabApiDist);
    expect(sourceOf(files, grabApiDist)).not.toMatch(heavy);
    expect(bytesOf(files, grabApiDist)).toBeLessThan(30_000);
  });

  it('still gives grab-api.js/full the DOM parser and the unzipper', () => {
    const files = reachableFrom('index.es.js', grabApiDist);
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
    for (const [distDir, entry] of [
      [grabApiDist, 'grab-api/src/index.slim.d.ts'],
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
