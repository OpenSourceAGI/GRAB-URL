/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// This config builds **the library only** — what `import ... from "grab-url"`
// resolves to. The two programs that used to ride along in this bundle now
// build from their own configs, so neither reaches the published `grab-url`:
//
//   packages/grab-url-cli/vite.config.ts   the `grab-url` / `grab` / `g` bins
//   packages/archiver-web/vite.config.ts   the `extract` / `compress` bins
//
// Keep it that way. An entry added here ends up in every consumer's install.

// React must never be bundled into `dist/quantum-sphere.*`: the host app already
// has its own copy, and a second one makes every hook in QuantumOrbital throw
// "Invalid hook call". No other entry imports React, so this is a no-op for them.
const reactExternals = ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"];

// `jszip` is resolved at runtime by archiver-web (local install, then CDN), so
// it is never bundled and never a dependency of this package.
const runtimeResolvedPkgs = ["jszip"];

// The alias targets are extensionless on purpose. vite-plugin-dts rewrites an
// aliased import in the emitted .d.ts to a relative path built from the alias
// target, so a `.ts` here ships as `import … from './…/log-json.ts'` inside the
// declarations — which fails for any consumer without
// `allowImportingTsExtensions`, and points at a `.ts` the tarball does not have.
const sharedAlias = {
  "@grab-url/log": resolve(__dirname, "../../packages/log-json/src/log-json"),
  "@grab-url/grab-api": resolve(__dirname, "../../packages/grab-api/src/index"),
  // The heyapi client imports the published package name; inside the monorepo
  // that resolves to the same source. The subpaths are listed first because a
  // string alias matches as a prefix: "grab-url" alone would rewrite
  // "grab-url/full" to ".../index.slim/full" and fail to resolve.
  "grab-url/full": resolve(__dirname, "../../packages/grab-api/src/index"),
  "grab-url/slim": resolve(__dirname, "../../packages/grab-api/src/index.slim"),
  // Bare "grab-url" is the slim entry — same as the published `exports` map.
  "grab-url": resolve(__dirname, "../../packages/grab-api/src/index.slim"),
};

/**
 * Restores the `"use client"` directive on the quantum-sphere bundles.
 *
 * Rollup drops the source file's own module-level directive when bundling, and
 * a `banner` does not survive either — terser re-parses the chunk afterwards
 * and discards a directive it reads as dead code in an ES module. Writing it in
 * `generateBundle`, which runs after minification, is the one point where it
 * sticks. Without it a React Server Component importing the sphere fails on the
 * first hook.
 */
const useClientDirective = {
  name: "use-client-directive",
  generateBundle(_options: unknown, bundle: Record<string, { type: string; name?: string; code?: string }>) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type === "chunk" && chunk.name === "quantum-sphere" && chunk.code) {
        chunk.code = `"use client";\n${chunk.code}`;
      }
    }
  },
};

const sharedPlugins = [
  useClientDirective,
  dts({
    insertTypesEntry: true,
    // Only the packages the entries below are built from. Widening this ships
    // declaration trees for the CLI and the codegen client inside `grab-url`.
    include: [
      "../../packages/grab-api/**/*.ts",
      "../../packages/log-json/**/*.ts",
      "../../packages/loading-animations/**/*.ts",
      "../../packages/quantum-sphere-loading-animation/**/*.ts",
      "../../packages/quantum-sphere-loading-animation/**/*.tsx",
    ],
    exclude: [
      "../../packages/quantum-sphere-loading-animation/svelte/**",
      "../../packages/quantum-sphere-loading-animation/src/svelte/**",
      "../../packages/quantum-sphere-loading-animation/demo/**",
      "../../packages/quantum-sphere-loading-animation/dist/**",
      "../../packages/quantum-sphere-loading-animation/node_modules/**",
    ],
    outDir: "dist",
    rollupTypes: false,
  }),
];

export default defineConfig({
  resolve: {
    alias: sharedAlias,
  },
  plugins: sharedPlugins,
  build: {
    target: "es2022",
    lib: {
      entry: {
        // `grab-api-slim` is what bare `grab-url` resolves to — the default
        // import. `grab-api` is the `grab-url/full` build, which reaches
        // `content-processors.ts` and through it linkedom and archiver-web.
        "grab-api-slim": resolve(__dirname, "../../packages/grab-api/src/index.slim.ts"),
        "grab-api": resolve(__dirname, "../../packages/grab-api/src/index.ts"),
        animations: resolve(__dirname, "../../packages/loading-animations/src/svg/index.ts"),
        "quantum-sphere": resolve(__dirname, "../../packages/quantum-sphere-loading-animation/src/icons.ts"),
        log: resolve(__dirname, "../../packages/log-json/src/log-json.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: false,
      },
      external: (id) => {
        if (id.startsWith("node:")) return true;
        if (reactExternals.includes(id)) return true;
        if (runtimeResolvedPkgs.includes(id)) return true;
        return false;
      },
    },
    minify: "terser",
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    globals: true,
    // The suite lives here but exercises every package's source, so the test
    // project is rooted at the monorepo. Vitest only instruments files that
    // sit inside the project root: rooted at this package, v8 reported nothing
    // for `grab-api`, `log-json`, `api2client` or `archiver-web`, and the
    // coverage globs below could not reach them either.
    root: resolve(__dirname, "../.."),
    include: ["packages/grab-url/test/**/*.test.ts"],
    resolve: {
      alias: {
        ...sharedAlias,
      },
    },
    server: {
      deps: {
        inline: true,
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      reportsDirectory: "coverage",
      reportOnFailure: true,
      include: ["packages/**/src/**"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.svelte",
        "**/svelte/**",
        "**/svg/**",
        "**/demo/**",
      ],
    },
  },
});
