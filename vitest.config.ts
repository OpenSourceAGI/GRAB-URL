/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import { sharedAlias } from "./packages/grab-url/vite.config";

/**
 * The repo-wide test config.
 *
 * The suite lives in the root `test/` folder and covers every package at once,
 * so it is configured here rather than inside any one package. It reuses
 * `sharedAlias` from the `grab-url` build config so a test resolves
 * `grab-url` and the `@grab-url/*` internals to the same sources the shipped
 * bundle is built from.
 */
export default defineConfig({
  resolve: {
    alias: sharedAlias,
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      reportsDirectory: "./coverage",
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
