import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// archiver-web builds on its own so its two bins never ship inside `grab-url`.
// `grab-url/full` still reaches this code — it dynamic-imports "archiver-web"
// from `content-processors.ts`, and that import is bundled into a lazy chunk of
// the full build rather than resolved from here.

// The library half runs in a browser, but the two bins are Node programs:
// without these, vite swaps `util`/`fs`/`path` for its browser stub and the
// build fails on `parseArgs`.
const nodeBuiltins = ["fs", "path", "util", "url", "stream", "stream/promises", "process", "os", "buffer"];

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts"],
      outDir: "dist",
      rollupTypes: false,
    }),
  ],
  build: {
    target: "es2022",
    lib: {
      entry: {
        "archiver-web": resolve(__dirname, "src/index.ts"),
        "bin-extract": resolve(__dirname, "src/bin-extract.ts"),
        "bin-compress": resolve(__dirname, "src/bin-compress.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: false,
        // Without the shebang the bins are not executable.
        banner: (chunk) => (chunk.name?.startsWith("bin-") ? "#!/usr/bin/env node\n" : ""),
      },
      external: (id) => {
        if (id.startsWith("node:") || nodeBuiltins.includes(id)) return true;
        // Resolved at runtime from a local install or the CDN — see the
        // loaders in `src/index.ts`. Never bundled, so a local install
        // doesn't defeat the lazy-load. `libarchive.js/...` also covers its
        // `dist/libarchive-node.mjs` Node-specific subpath import.
        if (id === "jszip" || id === "fflate" || id === "libarchive.js" || id.startsWith("libarchive.js/")) {
          return true;
        }
        return false;
      },
    },
    minify: "terser",
    sourcemap: true,
    emptyOutDir: true,
  },
});
