import { defineConfig } from "vite";
import { resolve } from "path";

// The CLI builds on its own so it never lands inside the published `grab-url`.
// `grab-url` is a library you import; this is a program you run, it pulls in
// chalk/cli-table3/cli-progress and a yt-dlp postinstall, and none of that
// belongs in a browser bundle. See `.claude/architecture/build.md`.

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

export default defineConfig({
  resolve: {
    alias: {
      "@grab-url/log": resolve(__dirname, "../log-json/src/log-json.ts"),
      // The CLI downloads pages and archives, so it wants the full grab with
      // DOM parsing and unzip — not the slim default.
      "@grab-url/grab-api": resolve(__dirname, "../grab-api/src/index.ts"),
      "grab-url/full": resolve(__dirname, "../grab-api/src/index.ts"),
      "grab-url/slim": resolve(__dirname, "../grab-api/src/index.slim.ts"),
      "grab-url": resolve(__dirname, "../grab-api/src/index.slim.ts"),
    },
  },
  build: {
    target: "es2022",
    lib: {
      entry: {
        "grab-url-cli": resolve(__dirname, "src/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: false,
        // Without the shebang the bin is not executable. A renamed entry
        // silently loses it, so this matches by name on purpose.
        banner: (chunk) => (chunk.name === "grab-url-cli" ? "#!/usr/bin/env node\n" : ""),
      },
      external: (id) => {
        if (id.startsWith("node:") || nodeBuiltins.includes(id)) return true;
        if (externalPkgs.includes(id)) return true;
        if (id === "jszip" || id === "fflate") return true;
        return false;
      },
    },
    minify: "terser",
    sourcemap: true,
    emptyOutDir: true,
  },
});
