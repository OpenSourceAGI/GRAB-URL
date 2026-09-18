/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

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

const sharedAlias = {
  "@grab-url/log": resolve(__dirname, "../../packages/log-json/src/log-json.ts"),
  "@grab-url/grab-api": resolve(__dirname, "../../packages/grab-api/src/index.ts"),
  // The heyapi client imports the published package name; inside the
  // monorepo that resolves to the same source. The slim subpath is listed
  // first because a string alias matches as a prefix: "grab-url" alone would
  // rewrite "grab-url/slim" to ".../index.ts/slim" and fail to resolve.
  "grab-url/slim": resolve(__dirname, "../../packages/grab-api/src/index.slim.ts"),
  "grab-url": resolve(__dirname, "../../packages/grab-api/src/index.ts"),
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
    include: ["../../packages/**/*.ts", "../../packages/**/*.tsx"],
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
        "grab-api": resolve(__dirname, "../../packages/grab-api/src/index.ts"),
        "grab-api-slim": resolve(__dirname, "../../packages/grab-api/src/index.slim.ts"),
        animations: resolve(__dirname, "../../packages/loading-animations/src/svg/index.ts"),
        "quantum-sphere": resolve(__dirname, "../../packages/quantum-sphere-loading-animation/src/icons.ts"),
        log: resolve(__dirname, "../../packages/log-json/src/log-json.ts"),
        "grab-url-cli": resolve(__dirname, "../../packages/grab-url-cli/src/index.ts"),
        "archiver-web": resolve(
          __dirname,
          "../../packages/archiver-web/src/index.ts",
        ),
        "bin-extract": resolve(
          __dirname,
          "../../packages/archiver-web/src/bin-extract.ts",
        ),
        "bin-compress": resolve(
          __dirname,
          "../../packages/archiver-web/src/bin-compress.ts",
        ),
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
