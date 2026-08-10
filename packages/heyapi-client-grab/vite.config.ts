import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

const external = ["grab-url", "@hey-api/openapi-ts"];

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
