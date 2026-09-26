import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// `grab-api.js` publishes the core request manager on its own — the same
// `grab()` that `grab-url` ships, without the loading animations, the quantum
// sphere or the CLI. `packages/grab-url/vite.config.ts` builds the umbrella
// package from this same source; this config builds only what belongs here, so
// the two dists never have to agree on anything but the entry names.
//
// The build is deliberately kept to the two entries the `exports` map names.
// An entry added here ends up in every consumer's install.

// `@grab-url/log` is a private workspace package: it has no dist and is never
// published, so it is inlined into both bundles rather than left as an import
// a consumer could not resolve. `grab-url` does the same.
//
// The target is extensionless, like every alias in this repo: vite-plugin-dts
// builds the specifier it writes into an emitted `.d.ts` from the alias target,
// and a `.ts` there ships a path no consumer can import. See
// `.claude/architecture/build.md#aliases`.
const sharedAlias = {
  "@grab-url/log": resolve(__dirname, "../log-json/src/log-json"),
};

// `jszip` and `libarchive.js` are resolved at runtime by archiver-web (local
// install, then CDN), so neither is ever bundled or a dependency of this
// package. `libarchive.js` also has to stay unbundled rather than merely
// "not a dependency": its Node build imports bare `worker_threads`/`url`,
// and this package's build must never see a Node builtin (see this
// directory's CLAUDE.md) — tracing into it here fails the exact same way
// archiver-web's own build did before it externalized `libarchive.js` too.
const runtimeResolvedPkgs = ["jszip"];
const runtimeResolvedPkgPrefixes = ["libarchive.js"];

export default defineConfig({
  resolve: {
    alias: sharedAlias,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts", "../log-json/src/**/*.ts"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.ts"],
      outDir: "dist",
      // Rolled up, unlike `grab-url`'s per-file trees. The source imports
      // `@grab-url/log`, which is private and never published: left unrolled,
      // the emitted `index.slim.d.ts` points at `../../log-json/src/...`, a
      // path that escapes the tarball and resolves to nothing once installed.
      // api-extractor inlines those types instead, so each entry's `.d.ts` is
      // self-contained.
      rollupTypes: true,
    }),
  ],
  build: {
    target: "es2022",
    lib: {
      entry: {
        // `grab-api-slim` is what bare `grab-api.js` resolves to — the default
        // import. `grab-api` is the `grab-api.js/full` build, which reaches
        // `content-processors.ts` and through it linkedom and archiver-web.
        "grab-api-slim": resolve(__dirname, "src/index.slim.ts"),
        "grab-api": resolve(__dirname, "src/index.ts"),
      },
      formats: ["es", "cjs"],
      // The CJS entries must end in `.cjs`, not `.cjs.js`. This package is
      // `"type": "module"`, so Node reads any `.js` file as ESM — a
      // `require()` of a `.cjs.js` entry died on "exports is not defined in ES
      // module scope" before it ran a line. Rollup already names the shared
      // CJS chunks `.cjs`; only the entries went through this callback.
      fileName: (format, entryName) =>
        format === "cjs" ? `${entryName}.cjs` : `${entryName}.es.js`,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: false,
      },
      external: (id) => {
        if (id.startsWith("node:")) return true;
        if (runtimeResolvedPkgs.includes(id)) return true;
        if (runtimeResolvedPkgPrefixes.some((pkg) => id === pkg || id.startsWith(`${pkg}/`))) return true;
        return false;
      },
    },
    minify: "terser",
    sourcemap: true,
    emptyOutDir: true,
  },
});
