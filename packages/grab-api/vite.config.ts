import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// `grab-api.js` publishes this package's two entries on their own — just
// `grab()`, without the loading icons and spinners that ride along in
// `grab-url`. Same source, so the two must stay in step: the entry shape here
// mirrors `packages/grab-url/vite.config.ts`, slim as the default and `./full`
// for the DOM + zip build. See `.claude/architecture/build.md`.

const runtimeResolvedPkgs = ["jszip"];

export default defineConfig({
  resolve: {
    alias: {
      // log-json is bundled in rather than exposed as a separate entry: this
      // package's product is `grab()`, and `log()` comes with it.
      "@grab-url/log": resolve(__dirname, "../log-json/src/log-json"),
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts", "../log-json/src/**/*.ts"],
      outDir: "dist",
      rollupTypes: false,
    }),
  ],
  build: {
    target: "es2022",
    lib: {
      entry: {
        // `index.slim` is what the bare `grab-api.js` import resolves to.
        // `index` is `grab-api.js/full`, which reaches `content-processors.ts`
        // and through it linkedom and archiver-web, both lazily.
        "index.slim": resolve(__dirname, "src/index.slim.ts"),
        index: resolve(__dirname, "src/index.ts"),
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
        if (runtimeResolvedPkgs.includes(id)) return true;
        return false;
      },
    },
    minify: "terser",
    sourcemap: true,
    emptyOutDir: true,
  },
});
