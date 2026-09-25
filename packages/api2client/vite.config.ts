import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// grab is never bundled: the generated SDK and the app it lives in must share
// one grab module, or a stub registered on `grab.mock` is invisible to the
// other copy. Every grab entry is listed so a published SDK that imports the
// bare name stays external too — and so the heavy `grab-url/full` build can
// never be pulled into this bundle.
const external = ["grab-url", "grab-url/slim", "grab-url/full", "@hey-api/openapi-ts"];

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
