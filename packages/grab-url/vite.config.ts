import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

/**
 * `packages/`, one level up.
 *
 * `grab-url` is the published package, but its source lives in its sibling
 * packages — this config is what bundles all of them into `dist/` here. Every
 * entry below is resolved from this constant so the build does not depend on
 * the directory it is invoked from.
 */
const monorepoPackages = resolve(__dirname, "..");

const nodeBuiltins = [
  "fs",
  "path",
  "stream/promises",
  "stream",
  "readline",
  "url",
  "util",
  "os",
  "crypto",
  "child_process",
  "events",
  "buffer",
  "process",
  "assert",
  "timers",
  "tty",
  "zlib",
  "http",
  "https",
  "net",
  "dns",
  "cluster",
  "worker_threads",
];

// `extract-webpage` is the qwksearch content extractor behind `grab-url --page`.
// It is an optional peer dependency loaded through a runtime `import()`, and it
// drags in jsdom/linkedom, so it must never be pulled into the CLI bundle.
const externalPkgs = ["chalk", "cli-table3", "cli-progress", "cli-spinners", "extract-webpage"];
// React must never be bundled into `dist/quantum-sphere.*`: the host app already
// has its own copy, and a second one makes every hook in QuantumOrbital throw
// "Invalid hook call". No other entry imports React, so this is a no-op for them.
const reactExternals = ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"];
const slimExternalPkgs = [...externalPkgs, "archiver-web", "linkedom"];

/**
 * Source aliases shared by this build and the root Vitest config, so the tests
 * resolve `grab-url` and the `@grab-url/*` internals to exactly the sources the
 * shipped bundle is built from.
 */
export const sharedAlias = {
  "@grab-url/log": resolve(monorepoPackages, "log-json/src/log-json.ts"),
  "@grab-url/grab-api": resolve(monorepoPackages, "grab-api/src/index.ts"),
  // The heyapi client imports the published package name; inside the
  // monorepo that resolves to the same source.
  "grab-url": resolve(monorepoPackages, "grab-api/src/index.ts"),
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

const sharedPlugins = () => [
  useClientDirective,
  dts({
    insertTypesEntry: true,
    include: [
      resolve(monorepoPackages, "**/*.ts"),
      resolve(monorepoPackages, "**/*.tsx"),
    ],
    exclude: [
      resolve(monorepoPackages, "grab-url/**"),
      resolve(monorepoPackages, "native-app-wrapper/**"),
      resolve(monorepoPackages, "quantum-sphere-loading-animation/svelte/**"),
      resolve(monorepoPackages, "quantum-sphere-loading-animation/src/svelte/**"),
      resolve(monorepoPackages, "quantum-sphere-loading-animation/demo/**"),
      resolve(monorepoPackages, "quantum-sphere-loading-animation/dist/**"),
      resolve(monorepoPackages, "**/node_modules/**"),
      resolve(monorepoPackages, "**/dist/**"),
    ],
    outDir: "dist",
    rollupTypes: false,
  }),
];

export default defineConfig(() => ({
  resolve: {
    alias: sharedAlias,
  },
  plugins: sharedPlugins(),
  build: {
    target: "es2022",
    lib: {
      entry: {
        "grab-api": resolve(monorepoPackages, "grab-api/src/index.ts"),
        "grab-api-slim": resolve(monorepoPackages, "grab-api/src/index.slim.ts"),
        animations: resolve(monorepoPackages, "loading-animations/src/svg/index.ts"),
        "quantum-sphere": resolve(monorepoPackages, "quantum-sphere-loading-animation/src/icons.ts"),
        log: resolve(monorepoPackages, "log-json/src/log-json.ts"),
        "grab-url-cli": resolve(monorepoPackages, "grab-url-cli/src/index.ts"),
        "archiver-web": resolve(monorepoPackages, "archiver-web/src/index.ts"),
        "bin-extract": resolve(monorepoPackages, "archiver-web/src/bin-extract.ts"),
        "bin-compress": resolve(monorepoPackages, "archiver-web/src/bin-compress.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: false,
        banner: (chunk) => {
          if (chunk.name.startsWith("bin-") || chunk.name === "grab-url-cli") {
            return "#!/usr/bin/env node\n";
          }
          return "";
        },
      },
      external: (id, importer) => {
        if (id.startsWith("node:") || nodeBuiltins.includes(id)) return true;
        if (externalPkgs.includes(id)) return true;
        if (reactExternals.includes(id)) return true;
        if (id === "jszip") return true;
        // Externalize heavy deps for slim build entry
        if (slimExternalPkgs.includes(id) && importer?.includes("index.slim")) return true;
        return false;
      },
    },
    minify: "terser",
    sourcemap: true,
    emptyOutDir: true,
  },
}));
