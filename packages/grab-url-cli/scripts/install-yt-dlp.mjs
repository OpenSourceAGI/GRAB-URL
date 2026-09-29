#!/usr/bin/env node
/**
 * @file install-yt-dlp.mjs
 * @description Fetches the official `yt-dlp` standalone binary for this machine.
 *
 * grab-url hands media-site URLs to yt-dlp (see
 * `packages/grab-url-cli/src/transfer/media-domains.ts`), so it needs the binary
 * to be present. Two callers:
 *
 *   - `npm install` runs this as `postinstall`, which drops a copy in
 *     `~/.grab-url/bin` unless yt-dlp is already on PATH. It never fails the
 *     install: a machine with no network, a locked-down $HOME or a proxy that
 *     blocks GitHub still ends up with a working grab-url, just without the
 *     media-site path until yt-dlp is installed some other way.
 *   - `npm run ytdlp:sidecar` writes the binary under Tauri's `externalBin`
 *     naming (`yt-dlp-<target-triple>`) so a desktop build bundles its own copy
 *     and never depends on the user's PATH.
 *
 * The official release assets are single self-contained executables, so this
 * needs no Python, no package manager and no elevation. Set
 * `GRAB_SKIP_YTDLP_INSTALL=1` to opt out entirely.
 *
 * The platform/asset mapping is mirrored by
 * `packages/grab-url-cli/src/transfer/ytdlp-binary.ts`, which cannot import this
 * file — this one runs as plain ESM during `postinstall`, before any build
 * output exists. Keep the two in step.
 *
 * Usage:
 *   node scripts/install-yt-dlp.mjs                     # into ~/.grab-url/bin
 *   node scripts/install-yt-dlp.mjs --force             # redownload
 *   node scripts/install-yt-dlp.mjs --dir ./vendor      # somewhere else
 *   node scripts/install-yt-dlp.mjs --sidecar           # Tauri externalBin name
 *   node scripts/install-yt-dlp.mjs --sidecar --target aarch64-apple-darwin
 *   node scripts/install-yt-dlp.mjs --sidecar --out path/to/yt-dlp-<triple>
 */

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RELEASE_BASE = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download';

// ─── Argument parsing ─────────────────────────────────────────────────────────

/**
 * Read the flags this script understands out of an argv list.
 *
 * @param {string[]} argv - Arguments after the script name
 */
export function parseArgs(argv) {
    const flag = (name) => argv.includes(`--${name}`);
    const value = (name) => {
        const index = argv.indexOf(`--${name}`);
        if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
        const inline = argv.find((a) => a.startsWith(`--${name}=`));
        return inline ? inline.slice(name.length + 3) : null;
    };
    return {
        force: flag('force'),
        sidecar: flag('sidecar'),
        postinstall: flag('postinstall'),
        quiet: flag('quiet'),
        dir: value('dir'),
        out: value('out'),
        outDir: value('out-dir'),
        target: value('target'),
    };
}

// ─── Platform mapping ─────────────────────────────────────────────────────────

/**
 * Name of the release asset that runs on a given platform/arch.
 *
 * Falls back to the Python zipimport build (`yt-dlp`), which works anywhere a
 * python3 interpreter exists — the only option on, say, linux/ppc64.
 *
 * @param {NodeJS.Platform} platform - Node platform id
 * @param {string} arch - Node architecture id
 */
export function releaseAssetName(platform = process.platform, arch = process.arch) {
    if (platform === 'win32') return arch === 'ia32' ? 'yt-dlp_x86.exe' : 'yt-dlp.exe';
    if (platform === 'darwin') return 'yt-dlp_macos';
    if (platform === 'linux') {
        if (arch === 'x64') return 'yt-dlp_linux';
        if (arch === 'arm64') return 'yt-dlp_linux_aarch64';
        if (arch === 'arm') return 'yt-dlp_linux_armv7l';
    }
    return 'yt-dlp';
}

/**
 * Rust target triple for a platform/arch, used for Tauri sidecar file names.
 *
 * @param {NodeJS.Platform} platform - Node platform id
 * @param {string} arch - Node architecture id
 */
export function targetTriple(platform = process.platform, arch = process.arch) {
    const cpu = arch === 'x64' ? 'x86_64' : arch === 'arm64' ? 'aarch64' : arch === 'ia32' ? 'i686' : null;
    if (!cpu) return null;
    if (platform === 'darwin') return `${cpu}-apple-darwin`;
    if (platform === 'win32') return `${cpu}-pc-windows-msvc`;
    if (platform === 'linux') return `${cpu}-unknown-linux-gnu`;
    return null;
}

/**
 * Read the Rust target triple back out of a sidecar path such as
 * `.../yt-dlp-x86_64-unknown-linux-gnu.exe`.
 *
 * A wrapper that substitutes `{out}` has already resolved the triple from the
 * installed toolchain, and that is the name Tauri will search for at bundle
 * time. Taking it from the path rather than re-deriving it from
 * process.platform is what keeps the two from disagreeing on hosts the Node
 * mapping gets wrong — a musl Linux, or a 32-bit Node on a 64-bit machine.
 *
 * Both separators are handled rather than deferring to path.basename(), which
 * only understands the host's own — a Windows path cross-built from Linux would
 * otherwise parse to nothing.
 *
 * @param {string} outPath - Path the binary must be written to
 */
export function tripleFromSidecarPath(outPath) {
    const name = outPath.split(/[\\/]/).pop() ?? '';
    const match = /^yt-dlp-(.+)$/.exec(name.replace(/\.exe$/i, ''));
    return match ? match[1] : null;
}

/**
 * Release asset that runs on a given Rust target triple.
 *
 * @param {string} triple - e.g. `aarch64-apple-darwin`
 */
export function assetForTriple(triple) {
    const platform = triple.includes('windows') ? 'win32'
        : triple.includes('darwin') ? 'darwin'
            : 'linux';
    const cpu = /^(aarch64|arm64)/.test(triple) ? 'arm64'
        : /^i[356]86/.test(triple) ? 'ia32'
            : /^(armv7|arm-|thumbv7)/.test(triple) ? 'arm'
                : 'x64';
    return releaseAssetName(platform, cpu);
}

/** Executable file name for a platform. */
export function executableName(platform = process.platform) {
    return platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

/**
 * Where `npm install` keeps its managed copy. `GRAB_YTDLP_DIR` redirects it, for
 * a read-only or ephemeral $HOME.
 */
export function managedBinDirectory() {
    return process.env.GRAB_YTDLP_DIR || join(homedir(), '.grab-url', 'bin');
}

// ─── Probing ──────────────────────────────────────────────────────────────────

/**
 * Run `<candidate> --version` and return the version string, or null when the
 * candidate is absent or not runnable.
 *
 * @param {string} candidate - Path or bare command name
 */
export function probe(candidate) {
    try {
        const result = spawnSync(candidate, ['--version'], { encoding: 'utf8', timeout: 20_000 });
        if (result.error || result.status !== 0) return null;
        return (result.stdout || '').trim().split('\n')[0]?.trim() || null;
    } catch {
        return null;
    }
}

// ─── Download ─────────────────────────────────────────────────────────────────

/**
 * Download a URL to a buffer, preferring fetch() and falling back to curl and
 * wget — those honour the proxy environment variables that Node's fetch ignores,
 * which is how most locked-down networks reach GitHub.
 *
 * @param {string} url - Asset URL
 */
async function download(url) {
    try {
        const response = await fetch(url, { redirect: 'follow' });
        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
        return Buffer.from(await response.arrayBuffer());
    } catch (fetchError) {
        for (const [command, args] of [
            ['curl', ['-fsSL', url, '-o', '-']],
            ['wget', ['-qO-', url]],
        ]) {
            const result = spawnSync(command, args, { maxBuffer: 256 * 1024 * 1024 });
            if (!result.error && result.status === 0 && result.stdout?.length) return result.stdout;
        }
        throw fetchError;
    }
}

/**
 * Download an asset and move it into place, so a half-written file is never left
 * behind for {@link probe} to find.
 *
 * @param {string} asset - Release asset name
 * @param {string} destination - Absolute path to write
 */
async function install(asset, destination) {
    const data = await download(`${RELEASE_BASE}/${asset}`);
    if (data.length < 1024) throw new Error(`downloaded ${asset} is only ${data.length} bytes`);

    mkdirSync(dirname(destination), { recursive: true });
    const staging = join(tmpdir(), `yt-dlp-${process.pid}-${Date.now()}`);
    writeFileSync(staging, data);
    chmodSync(staging, 0o755);
    try {
        renameSync(staging, destination);
    } catch {
        // rename() fails across filesystems; a copy is fine, it is the last step.
        writeFileSync(destination, data);
        chmodSync(destination, 0o755);
        rmSync(staging, { force: true });
    }
    return destination;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function main() {
    const options = parseArgs(process.argv.slice(2));
    const say = (message) => { if (!options.quiet) console.log(message); };

    if (process.env.GRAB_SKIP_YTDLP_INSTALL) {
        say('grab-url: GRAB_SKIP_YTDLP_INSTALL is set — skipping yt-dlp download.');
        return;
    }

    if (options.sidecar) {
        // `--out` is the exact path a wrapper's {out} substitution asks for, so
        // the triple comes from that name rather than being derived again.
        const triple = options.target
            || (options.out && tripleFromSidecarPath(options.out))
            || targetTriple();
        if (!triple) throw new Error(`no Tauri target triple for ${process.platform}/${process.arch}`);

        const suffix = triple.includes('windows') ? '.exe' : '';
        const destination = options.out
            ? resolve(options.out)
            : join(resolve(options.outDir || 'src-tauri/binaries'), `yt-dlp-${triple}${suffix}`);

        if (existsSync(destination) && !options.force) {
            say(`grab-url: sidecar already present at ${destination} (use --force to refresh).`);
            return;
        }
        const asset = assetForTriple(triple);
        say(`grab-url: downloading ${asset} as Tauri sidecar ${destination}`);
        await install(asset, destination);
        say('grab-url: sidecar ready. Add "binaries/yt-dlp" to tauri.conf.json → bundle.externalBin.');
        return;
    }

    const destination = join(options.dir ? resolve(options.dir) : managedBinDirectory(), executableName());

    if (!options.force) {
        const managed = probe(destination);
        if (managed) { say(`grab-url: yt-dlp ${managed} already installed at ${destination}.`); return; }
        const onPath = probe('yt-dlp');
        if (onPath) { say(`grab-url: yt-dlp ${onPath} already on PATH — nothing to install.`); return; }
    }

    const asset = releaseAssetName();
    say(`grab-url: downloading yt-dlp (${asset}) to ${destination}`);
    await install(asset, destination);

    const version = probe(destination);
    if (!version) {
        throw new Error(
            `installed ${destination} but it would not run`
            + (asset === 'yt-dlp' ? ' — this build needs python3 on PATH.' : '.'),
        );
    }
    say(`grab-url: yt-dlp ${version} ready at ${destination}`);
}

// Run only when executed directly, so the pure helpers above stay unit-testable.
const isMain = process.argv[1]
    && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
    main().catch((error) => {
        const options = parseArgs(process.argv.slice(2));
        const message = `grab-url: could not install yt-dlp — ${error.message}`;
        if (options.postinstall) {
            // Never break `npm install` over an optional companion binary.
            console.warn(`${message}\n  Media-site URLs will need yt-dlp installed separately:`);
            console.warn('  npx grab-url --install-ytdlp   (or: brew / winget / pipx install yt-dlp)');
            process.exit(0);
        }
        console.error(message);
        process.exit(1);
    });
}
