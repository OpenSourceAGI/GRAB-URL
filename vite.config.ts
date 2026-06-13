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

const externalPkgs = ["chalk", "cli-table3", "cli-progress", "cli-spinners"];
const slimExternalPkgs = [...externalPkgs, "archiver-web", "linkedom"];

const sharedAlias = {
  "@grab-url/log": resolve(__dirname, "packages/log-json/src/log-json.ts"),
  "@grab-url/grab-api": resolve(__dirname, "packages/grab-api/src/index.ts"),
};

const sharedPlugins = [
  dts({
    insertTypesEntry: true,
    include: ["packages/**/*.ts", "packages/**/*.tsx"],
    exclude: [
      "packages/quantum-sphere-loading-animation/svelte/**",
      "packages/quantum-sphere-loading-animation/src/svelte/**",
      "packages/quantum-sphere-loading-animation/demo/**",
      "packages/quantum-sphere-loading-animation/dist/**",
      "packages/quantum-sphere-loading-animation/node_modules/**",
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
        "grab-api": resolve(__dirname, "packages/grab-api/src/index.ts"),
        "grab-api-slim": resolve(__dirname, "packages/grab-api/src/index.slim.ts"),
        animations: resolve(__dirname, "packages/loading-animations/src/svg/index.ts"),
        "quantum-sphere": resolve(__dirname, "packages/quantum-sphere-loading-animation/src/icons.ts"),
        log: resolve(__dirname, "packages/log-json/src/log-json.ts"),
        "grab-url-cli": resolve(__dirname, "packages/grab-url-cli/src/index.ts"),
        "archiver-web": resolve(
          __dirname,
          "packages/archiver-web/src/index.ts",
        ),
        "bin-extract": resolve(
          __dirname,
          "packages/archiver-web/src/bin-extract.ts",
        ),
        "bin-compress": resolve(
          __dirname,
          "packages/archiver-web/src/bin-compress.ts",
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
});
