/**
 * @file sidecar-profile.test.mjs
 * @description Tests for the sidecar half of the profile pipeline — the part
 * that decides what binary gets bundled and how the Rust side is allowed to
 * invoke it:
 *   - scripts/profile.mjs    (validation + defaults for the sidecar block)
 *   - scripts/configure.mjs  (externalBin wiring and the generated Rust consts)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadProfile, resolveProfileName } from "../scripts/profile.mjs";
import { configure } from "../scripts/configure.mjs";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** A throwaway package root holding one profile, so configure() can write freely. */
let workDir;

/** Writes profiles/<name>.json into the scratch root and returns the root. */
function withProfile(name, profile) {
  mkdirSync(path.join(workDir, "profiles"), { recursive: true });
  writeFileSync(
    path.join(workDir, "profiles", `${name}.json`),
    JSON.stringify(profile, null, 2),
  );
  return workDir;
}

/** The real grab-url profile, as the shipped one, for mutation in a test. */
function grabUrlProfile() {
  return JSON.parse(readFileSync(path.join(packageDir, "profiles/grab-url.json"), "utf8"));
}

beforeEach(() => {
  workDir = mkdtempSync(path.join(tmpdir(), "wrapper-test-"));
});
afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

// ─── The shipped profile ──────────────────────────────────────────────────────

describe("profiles/grab-url.json", () => {
  it("bundles yt-dlp as a local-mode sidecar", () => {
    const profile = loadProfile(packageDir, "grab-url");
    expect(profile.mode).toBe("local");
    expect(profile.sidecar.name).toBe("yt-dlp");
    expect(profile.url).toBeUndefined();
  });

  it("builds the sidecar through the repository's own installer", () => {
    const { sidecar } = loadProfile(packageDir, "grab-url");
    expect(sidecar.build).toContain("install-yt-dlp.mjs");
    // build-sidecar.mjs substitutes the path Tauri will look for here; without
    // it the binary lands somewhere the bundler never checks.
    expect(sidecar.build).toContain("{out}");
  });

  it("fixes every download flag except the URL", () => {
    const { sidecar } = loadProfile(packageDir, "grab-url");
    expect(sidecar.downloadArgs).toContain("--no-playlist");
    expect(sidecar.downloadArgs).toContain("--newline");
    // A URL in the fixed list would mean the app always downloaded that.
    expect(sidecar.downloadArgs.some((flag) => /^https?:/.test(flag))).toBe(false);
  });

  it("is the profile resolved by default, since example.json is ignored", () => {
    expect(resolveProfileName(packageDir, [])).toBe("grab-url");
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe("loadProfile() — sidecar validation", () => {
  it("defaults both argument lists to empty", () => {
    withProfile("bare", {
      appName: "Bare",
      identifier: "com.bare.app",
      version: "1.0.0",
      mode: "local",
      sidecar: { name: "tool" },
    });
    const profile = loadProfile(workDir, "bare");
    expect(profile.sidecar.args).toEqual([]);
    expect(profile.sidecar.downloadArgs).toEqual([]);
  });

  it("keeps the profile's own lists when it sets them", () => {
    withProfile("full", {
      appName: "Full",
      identifier: "com.full.app",
      version: "1.0.0",
      mode: "local",
      sidecar: { name: "tool", args: ["--version"], downloadArgs: ["--newline"] },
    });
    const profile = loadProfile(workDir, "full");
    expect(profile.sidecar.args).toEqual(["--version"]);
    expect(profile.sidecar.downloadArgs).toEqual(["--newline"]);
  });

  it("rejects a downloadArgs that is not a list of flags", () => {
    withProfile("bad", {
      appName: "Bad",
      identifier: "com.bad.app",
      version: "1.0.0",
      mode: "local",
      sidecar: { name: "tool", downloadArgs: "--newline" },
    });
    expect(() => loadProfile(workDir, "bad")).toThrow(/downloadArgs must be an array/);
  });

  it("still rejects pairing a sidecar with a wrapped website", () => {
    const profile = grabUrlProfile();
    profile.mode = "remote";
    profile.url = "https://example.com";
    withProfile("remote-sidecar", profile);
    expect(() => loadProfile(workDir, "remote-sidecar")).toThrow(/only callable from the bundled frontend/);
  });

  it("still rejects a build command that ignores {out}", () => {
    const profile = grabUrlProfile();
    profile.sidecar.build = "node ../../scripts/install-yt-dlp.mjs --sidecar";
    withProfile("no-out", profile);
    expect(() => loadProfile(workDir, "no-out")).toThrow(/must contain "\{out\}"/);
  });
});

// ─── Generated output ─────────────────────────────────────────────────────────

describe("configure() — sidecar wiring", () => {
  /** Runs configure over the real grab-url profile in the scratch root. */
  function configureGrabUrl(mutate = (p) => p) {
    withProfile("grab-url", mutate(grabUrlProfile()));
    cpSync(path.join(packageDir, "assets"), path.join(workDir, "assets"), { recursive: true });
    configure(workDir, "grab-url");
    return {
      tauriConf: JSON.parse(readFileSync(path.join(workDir, "src-tauri/tauri.conf.json"), "utf8")),
      rust: readFileSync(path.join(workDir, "src-tauri/src/generated_config.rs"), "utf8"),
    };
  }

  it("points externalBin at the sidecar's base name", () => {
    const { tauriConf } = configureGrabUrl();
    // Tauri appends the target triple itself, so the base name is correct here.
    expect(tauriConf.bundle.externalBin).toEqual(["binaries/yt-dlp"]);
  });

  it("loads the bundled frontend rather than a website", () => {
    const { tauriConf } = configureGrabUrl();
    expect(tauriConf.app.windows[0].url).toBe("index.html");
    expect(tauriConf.build.frontendDist).toBe("../dist");
  });

  it("emits both fixed argument lists as Rust constants", () => {
    const { rust } = configureGrabUrl();
    expect(rust).toContain('pub const SIDECAR_NAME: &str = "yt-dlp";');
    expect(rust).toContain('pub const SIDECAR_ARGS: &[&str] = &["--version"];');
    expect(rust).toMatch(/pub const SIDECAR_DOWNLOAD_ARGS: &\[&str\] = &\[.*"--no-playlist".*\];/);
  });

  it("escapes an output template so the Rust literal stays valid", () => {
    const { rust } = configureGrabUrl();
    // The template carries no quotes today, but it is user-supplied text going
    // straight into a Rust string literal, so it must be JSON-escaped.
    const line = rust.split("\n").find((l) => l.includes("SIDECAR_DOWNLOAD_ARGS"));
    expect(line).toContain('"%(title)s [%(id)s].%(ext)s"');
  });

  it("leaves SIDECAR_DOWNLOAD_ARGS empty when the sidecar is not a downloader", () => {
    const { rust } = configureGrabUrl((p) => {
      delete p.sidecar.downloadArgs;
      return p;
    });
    // download_media refuses to run in that case rather than invoking yt-dlp
    // with only a URL.
    expect(rust).toContain("pub const SIDECAR_DOWNLOAD_ARGS: &[&str] = &[];");
  });
});
