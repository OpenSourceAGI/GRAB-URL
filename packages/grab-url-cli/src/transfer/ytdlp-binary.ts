/**
 * @file ytdlp-binary.ts
 * @description Locating the `yt-dlp` executable at runtime.
 *
 * yt-dlp can reach the CLI three ways, and all three are checked in order of
 * how deliberate they are:
 *
 *   1. `GRAB_YTDLP_PATH` — an explicit path, which always wins.
 *   2. A binary bundled beside the host application. Tauri installs an
 *      `externalBin` sidecar next to the app executable with the target-triple
 *      suffix stripped, so a packaged desktop build ships its own copy and
 *      never touches the user's PATH.
 *   3. The managed copy `scripts/install-yt-dlp.mjs` downloads on `npm install`
 *      (into `~/.grab-url/bin`), then whatever `yt-dlp` is on PATH.
 *
 * The platform/asset mapping here is mirrored by `scripts/install-yt-dlp.mjs`,
 * which cannot import this module — it runs as plain ESM during `postinstall`,
 * before any build output exists. Keep the two in step.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface YtDlpBinary {
    /** Path or bare command name to spawn. */
    path: string;
    /** Version string reported by `yt-dlp --version`, e.g. `2025.09.05`. */
    version: string;
    /** Which of the search tiers produced it — surfaced in `--help` style output. */
    source: 'env' | 'bundled' | 'managed' | 'path';
}

// ─── Naming ───────────────────────────────────────────────────────────────────

/** Executable name for the current platform. */
export function ytDlpExecutableName(platform: NodeJS.Platform = process.platform): string {
    return platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

/**
 * Rust target triple for the current host, used for Tauri `externalBin`
 * sidecar names (`yt-dlp-x86_64-unknown-linux-gnu`).
 *
 * @param platform - Node platform id
 * @param arch     - Node architecture id
 */
export function hostTargetTriple(
    platform: NodeJS.Platform = process.platform,
    arch: string = process.arch,
): string | null {
    const cpu = arch === 'x64' ? 'x86_64' : arch === 'arm64' ? 'aarch64' : arch === 'ia32' ? 'i686' : null;
    if (!cpu) return null;
    if (platform === 'darwin') return `${cpu}-apple-darwin`;
    if (platform === 'win32') return `${cpu}-pc-windows-msvc`;
    if (platform === 'linux') return `${cpu}-unknown-linux-gnu`;
    return null;
}

/**
 * Candidate file names for a bundled yt-dlp: the installed name first, then the
 * triple-suffixed name a sidecar still carries during `tauri dev`.
 */
export function ytDlpBinaryNames(platform: NodeJS.Platform = process.platform, arch = process.arch): string[] {
    const exe = ytDlpExecutableName(platform);
    const triple = hostTargetTriple(platform, arch);
    if (!triple) return [exe];
    const suffixed = platform === 'win32' ? `yt-dlp-${triple}.exe` : `yt-dlp-${triple}`;
    return [exe, suffixed];
}

// ─── Search paths ─────────────────────────────────────────────────────────────

/**
 * Directory holding the copy `npm install` manages. Overridable with
 * `GRAB_YTDLP_DIR` so a sandboxed or read-only `$HOME` can redirect it.
 */
export function managedBinDirectory(): string {
    return process.env.GRAB_YTDLP_DIR || path.join(os.homedir(), '.grab-url', 'bin');
}

/**
 * Directories a host application may have bundled yt-dlp into, most specific
 * first. Covers a plain Tauri install (sidecar beside the executable), a macOS
 * `.app` bundle, and an AppImage.
 */
export function bundledSearchDirectories(): string[] {
    const dirs: string[] = [];
    const push = (dir: string | undefined | null) => { if (dir) dirs.push(dir); };

    const resourceDir = process.env.TAURI_RESOURCE_DIR;
    push(resourceDir);
    if (resourceDir) push(path.join(resourceDir, 'binaries'));

    const exeDir = path.dirname(process.execPath);
    push(exeDir);
    push(path.join(exeDir, 'binaries'));
    push(path.join(exeDir, 'resources'));
    // macOS: Contents/MacOS/<app> → Contents/Resources
    push(path.resolve(exeDir, '..', 'Resources'));
    push(path.resolve(exeDir, '..', 'Resources', 'binaries'));

    if (process.env.APPDIR) push(path.join(process.env.APPDIR, 'usr', 'bin'));

    return dirs;
}

// ─── Discovery ────────────────────────────────────────────────────────────────

/**
 * Run `<candidate> --version` and return the reported version, or null when the
 * candidate is missing, not executable, or not yt-dlp.
 *
 * @param candidate - Path or bare command name
 */
export function probeYtDlp(candidate: string): string | null {
    try {
        const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8', timeout: 15_000 });
        if (probe.error || probe.status !== 0) return null;
        const version = (probe.stdout || '').trim().split('\n')[0]?.trim();
        // yt-dlp prints a bare date-based version; anything else is a different binary.
        return /^\d{4}\.\d{2}\.\d{2}/.test(version || '') ? version! : version || 'unknown';
    } catch {
        return null;
    }
}

/**
 * Locate a usable yt-dlp, or null when none is installed.
 *
 * Each tier is probed rather than merely stat-ed: a stale sidecar from a
 * different architecture exists on disk but cannot run, and falling through to
 * the next tier is better than failing the transfer.
 */
export function findYtDlp(): YtDlpBinary | null {
    const explicit = process.env.GRAB_YTDLP_PATH;
    if (explicit) {
        const version = probeYtDlp(explicit);
        if (version) return { path: explicit, version, source: 'env' };
    }

    const names = ytDlpBinaryNames();
    for (const dir of bundledSearchDirectories()) {
        for (const name of names) {
            const candidate = path.join(dir, name);
            if (!fs.existsSync(candidate)) continue;
            const version = probeYtDlp(candidate);
            if (version) return { path: candidate, version, source: 'bundled' };
        }
    }

    const managed = path.join(managedBinDirectory(), ytDlpExecutableName());
    if (fs.existsSync(managed)) {
        const version = probeYtDlp(managed);
        if (version) return { path: managed, version, source: 'managed' };
    }

    const onPath = probeYtDlp('yt-dlp');
    if (onPath) return { path: 'yt-dlp', version: onPath, source: 'path' };

    return null;
}

/** Platform-appropriate install hint shown when yt-dlp is missing. */
export function ytDlpInstallHint(): string {
    return [
        'npx grab-url --install-ytdlp',
        process.platform === 'darwin'
            ? '   (or: brew install yt-dlp)'
            : process.platform === 'win32'
                ? '   (or: winget install yt-dlp.yt-dlp)'
                : '   (or: sudo apt install yt-dlp / pipx install yt-dlp)',
    ].join('\n');
}
