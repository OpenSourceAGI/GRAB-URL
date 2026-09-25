import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// grab is never bundled: the generated SDK and the app it lives in must share
// one grab module, or a stub registered on `grab.mock` is invisible to the
// other copy. The client imports `grab-api.js` — the bare grab() without
// grab-url's loading icons — and every grab entry is listed so the heavy
// `/full` builds can never be pulled into this bundle.
const external = [
  "grab-api.js",
  "grab-api.js/slim",
  "grab-api.js/full",
  "grab-url",
  "grab-url/slim",
  "grab-url/full",
  "@hey-api/openapi-ts",
];

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts"],
      outDir: "dist",
    }),
  ],
  build: {
    target: "es2022",
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        cli: resolve(__dirname, "src/cli.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      external: (id) => id.startsWith("node:") || external.includes(id),
      output: {
        inlineDynamicImports: false,
        banner: (chunk) => (chunk.name === "cli" ? "#!/usr/bin/env node\n" : ""),
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
