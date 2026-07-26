import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/svg/**/*.ts"],
      outDir: "dist",
    }),
  ],
  build: {
    target: "es2022",
    lib: {
      entry: {
        "svg/index": resolve(__dirname, "src/svg/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: false,
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
