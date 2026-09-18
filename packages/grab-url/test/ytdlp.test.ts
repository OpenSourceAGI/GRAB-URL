/**
 * @file ytdlp.test.ts
 * @description Unit tests for the yt-dlp-backed media path:
 *   - transfer/media-domains.ts   (domain matching)
 *   - transfer/ytdlp-transfer.ts  (target detection, arg building, readout parsing)
 *   - transfer/ytdlp-binary.ts    (naming, search paths, discovery)
 *   - scripts/install-yt-dlp.mjs  (argument parsing, platform → asset mapping)
 */

import { describe, it, expect, afterEach } from 'vitest';

import {
    MEDIA_DOMAINS,
    matchMediaDomain,
    isMediaDomain,
    hostnameOf,
} from '../../grab-url-cli/src/transfer/media-domains.ts';

import {
    isYtDlpTarget,
    describeYtDlpTarget,
    buildYtDlpArgs,
    parseYtDlpProgress,
    parseYtDlpDestination,
    isYtDlpNoise,
    describeYtDlpExit,
    resolveYtDlpSite,
    YTDLP_PROGRESS_TEMPLATE,
} from '../../grab-url-cli/src/transfer/ytdlp-transfer.ts';

import {
    ytDlpExecutableName,
    ytDlpBinaryNames,
    hostTargetTriple,
    managedBinDirectory,
    bundledSearchDirectories,
    probeYtDlp,
    findYtDlp,
    ytDlpInstallHint,
} from '../../grab-url-cli/src/transfer/ytdlp-binary.ts';

import {
    parseArgs,
    releaseAssetName,
    assetForTriple,
    tripleFromSidecarPath,
    targetTriple,
    executableName,
} from '../scripts/install-yt-dlp.mjs';

// ─── Domain matching ──────────────────────────────────────────────────────────

describe('media-domains — MEDIA_DOMAINS', () => {
    it('carries the full site list with no duplicates', () => {
        expect(MEDIA_DOMAINS.length).toBeGreaterThan(700);
        expect(new Set(MEDIA_DOMAINS).size).toBe(MEDIA_DOMAINS.length);
    });
    it('is sorted, so additions land as one-line diffs', () => {
        expect([...MEDIA_DOMAINS]).toEqual([...MEDIA_DOMAINS].sort());
    });
    it('holds only lowercase entries', () => {
        expect(MEDIA_DOMAINS.filter((d) => d !== d.toLowerCase())).toEqual([]);
    });
});

describe('media-domains — hostnameOf()', () => {
    it('lowercases the host', () => {
        expect(hostnameOf('https://WWW.YouTube.com/watch?v=x')).toBe('www.youtube.com');
    });
    it('drops a trailing root dot', () => {
        expect(hostnameOf('https://youtube.com./watch')).toBe('youtube.com');
    });
    it('rejects non-http schemes', () => {
        expect(hostnameOf('magnet:?xt=urn:btih:abc')).toBeNull();
        expect(hostnameOf('sftp://host/file.iso')).toBeNull();
        expect(hostnameOf('file:///tmp/x.mp4')).toBeNull();
    });
    it('rejects unparseable input', () => {
        expect(hostnameOf('./local/file.torrent')).toBeNull();
        expect(hostnameOf('')).toBeNull();
    });
});

describe('media-domains — matchMediaDomain()', () => {
    it('matches an exact host', () => {
        expect(matchMediaDomain('https://youtube.com/watch?v=x')).toBe('youtube.com');
    });
    it('matches www and other subdomains', () => {
        expect(matchMediaDomain('https://www.youtube.com/watch?v=x')).toBe('youtube.com');
        expect(matchMediaDomain('https://music.youtube.com/watch?v=x')).toBe('youtube.com');
    });
    it('matches short-link domains', () => {
        expect(matchMediaDomain('https://youtu.be/dQw4w9WgXcQ')).toBe('youtu.be');
        expect(matchMediaDomain('https://t.me/somechannel/42')).toBe('t.me');
    });
    it('matches multi-label entries without capturing the parent domain', () => {
        expect(matchMediaDomain('https://areena.yle.fi/1-50534973')).toBe('areena.yle.fi');
        expect(matchMediaDomain('https://yle.fi/uutiset')).toBeNull();
        expect(matchMediaDomain('https://gem.cbc.ca/show')).toBe('gem.cbc.ca');
    });
    it('matches a domain that is itself a subdomain of another entry', () => {
        // cbc.ca is listed too, so a bare cbc.ca URL still routes to yt-dlp.
        expect(matchMediaDomain('https://www.cbc.ca/player/play/1.234')).toBe('cbc.ca');
    });
    it('treats dot-free entries as software markers', () => {
        expect(matchMediaDomain('https://peertube.tv/w/abc')).toBe('peertube');
        expect(matchMediaDomain('https://video.peertube-host.fr/w/abc')).toBe('peertube');
    });
    it('does not match a lookalike host', () => {
        expect(matchMediaDomain('https://notyoutube.com/watch')).toBeNull();
        expect(matchMediaDomain('https://youtube.com.evil.test/watch')).toBeNull();
        expect(matchMediaDomain('https://example.com/video.mp4')).toBeNull();
    });
    it('ignores non-http targets so aria2 keeps its own', () => {
        expect(matchMediaDomain('magnet:?xt=urn:btih:abc&dn=youtube.com')).toBeNull();
    });
});

describe('media-domains — isMediaDomain()', () => {
    it('is the boolean form of matchMediaDomain', () => {
        expect(isMediaDomain('https://vimeo.com/12345')).toBe(true);
        expect(isMediaDomain('https://example.org/file.zip')).toBe(false);
    });
});

// ─── Target detection ─────────────────────────────────────────────────────────

describe('yt-dlp — isYtDlpTarget()', () => {
    it('claims pages on listed sites', () => {
        expect(isYtDlpTarget('https://www.twitch.tv/videos/123')).toBe(true);
    });
    it('leaves plain file URLs to the HTTP downloader', () => {
        expect(isYtDlpTarget('https://releases.ubuntu.com/24.04/ubuntu.iso')).toBe(false);
    });
});

describe('yt-dlp — describeYtDlpTarget()', () => {
    it('prefers the v= query parameter', () => {
        expect(describeYtDlpTarget('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
            .toBe('youtube.com/dQw4w9WgXcQ');
    });
    it('falls back to the last path segment', () => {
        expect(describeYtDlpTarget('https://vimeo.com/76979871')).toBe('vimeo.com/76979871');
    });
    it('falls back to the host for a bare site URL', () => {
        expect(describeYtDlpTarget('https://vimeo.com/')).toBe('vimeo.com/vimeo.com');
    });
});

describe('yt-dlp — resolveYtDlpSite()', () => {
    it('labels a listed site by its list entry', () => {
        expect(resolveYtDlpSite('https://music.youtube.com/watch?v=x')).toBe('youtube.com');
    });
    it('accepts an off-list host, so --ytdlp can force any page through', () => {
        // The domain list routes; it must not gate. Refusing here would make
        // --ytdlp a no-op for exactly the URLs it exists to handle.
        expect(resolveYtDlpSite('https://example.com/clip.mp4')).toBe('example.com');
        expect(resolveYtDlpSite('http://127.0.0.1:8731/sample.mp4')).toBe('127.0.0.1');
    });
    it('rejects the schemes that belong to aria2c', () => {
        expect(() => resolveYtDlpSite('magnet:?xt=urn:btih:abc')).toThrow(/http\(s\) URL/);
        expect(() => resolveYtDlpSite('sftp://host/file.iso')).toThrow(/http\(s\) URL/);
        expect(() => resolveYtDlpSite('./local.torrent')).toThrow(/http\(s\) URL/);
    });
});

// ─── Argument building ────────────────────────────────────────────────────────

describe('yt-dlp — buildYtDlpArgs()', () => {
    const args = (opts = {}) => buildYtDlpArgs('https://youtu.be/abc', opts);

    it('always asks for machine-readable progress', () => {
        const result = args();
        expect(result).toContain('--newline');
        expect(result).toContain('--progress-template');
        expect(result[result.indexOf('--progress-template') + 1]).toBe(YTDLP_PROGRESS_TEMPLATE);
    });
    it('puts the target last', () => {
        expect(args().at(-1)).toBe('https://youtu.be/abc');
    });
    it('defaults to a single item, not the whole playlist', () => {
        expect(args()).toContain('--no-playlist');
        expect(args({ playlist: true })).toContain('--yes-playlist');
        expect(args({ playlist: true })).not.toContain('--no-playlist');
    });
    it('uses a title+id output template unless one is given', () => {
        const result = args();
        expect(result[result.indexOf('--output') + 1]).toBe('%(title)s [%(id)s].%(ext)s');
        const named = args({ output: 'clip.mp4' });
        expect(named[named.indexOf('--output') + 1]).toBe('clip.mp4');
    });
    it('passes the destination directory through --paths', () => {
        const result = args({ dir: '/tmp/media' });
        expect(result[result.indexOf('--paths') + 1]).toBe('/tmp/media');
    });
    it('adds the format selector only when set', () => {
        expect(args()).not.toContain('--format');
        const result = args({ format: 'bestvideo+bestaudio' });
        expect(result[result.indexOf('--format') + 1]).toBe('bestvideo+bestaudio');
    });
    it('turns audioFormat into an extract-audio pair', () => {
        const result = args({ audioFormat: 'mp3' });
        expect(result).toContain('--extract-audio');
        expect(result[result.indexOf('--audio-format') + 1]).toBe('mp3');
    });
    it('forwards a browser cookie source', () => {
        const result = args({ cookiesFromBrowser: 'firefox' });
        expect(result[result.indexOf('--cookies-from-browser') + 1]).toBe('firefox');
    });
    it('appends extra args ahead of the target', () => {
        const result = args({ extraArgs: ['--limit-rate', '1M'] });
        expect(result.slice(-3)).toEqual(['--limit-rate', '1M', 'https://youtu.be/abc']);
    });
});

// ─── Readout parsing ──────────────────────────────────────────────────────────

describe('yt-dlp — parseYtDlpProgress()', () => {
    it('parses a full progress line', () => {
        const progress = parseYtDlpProgress('@GRAB@downloading|1048576|10485760|NA|524288.0|18|NA|NA');
        expect(progress).toEqual({
            status: 'downloading',
            downloaded: 1048576,
            total: 10485760,
            estimated: false,
            speedBps: 524288,
            etaSeconds: 18,
            fragmentIndex: null,
            fragmentCount: null,
        });
    });
    it('falls back to the estimate and flags it', () => {
        const progress = parseYtDlpProgress('@GRAB@downloading|500|NA|4096|1000|4|NA|NA')!;
        expect(progress.total).toBe(4096);
        expect(progress.estimated).toBe(true);
    });
    it('keeps fragment counters for HLS streams', () => {
        const progress = parseYtDlpProgress('@GRAB@downloading|100|NA|NA|50|NA|3|120')!;
        expect(progress.fragmentIndex).toBe(3);
        expect(progress.fragmentCount).toBe(120);
    });
    it('treats NA and None as unknown rather than NaN', () => {
        const progress = parseYtDlpProgress('@GRAB@downloading|NA|None|NA|NA|NA|NA|NA')!;
        expect(progress.downloaded).toBe(0);
        expect(progress.total).toBe(0);
        expect(progress.speedBps).toBe(0);
    });
    it('rounds a fractional ETA', () => {
        expect(parseYtDlpProgress('@GRAB@downloading|1|2|NA|3|4.7|NA|NA')!.etaSeconds).toBe(5);
    });
    it('survives the sentinel arriving mid-line', () => {
        expect(parseYtDlpProgress('[download] @GRAB@finished|10|10|NA|0|0|NA|NA')!.status)
            .toBe('finished');
    });
    it('returns null for every other line', () => {
        expect(parseYtDlpProgress('[youtube] abc: Downloading webpage')).toBeNull();
        expect(parseYtDlpProgress('')).toBeNull();
    });
    it('returns null for a truncated sentinel line', () => {
        expect(parseYtDlpProgress('@GRAB@downloading|1|2')).toBeNull();
    });
});

describe('yt-dlp — parseYtDlpDestination()', () => {
    it('reads the download destination', () => {
        expect(parseYtDlpDestination('[download] Destination: Never Gonna [abc].f137.mp4'))
            .toBe('Never Gonna [abc].f137.mp4');
    });
    it('reads the merged output path', () => {
        expect(parseYtDlpDestination('[Merger] Merging formats into "Never Gonna [abc].mp4"'))
            .toBe('Never Gonna [abc].mp4');
    });
    it('reads the extracted-audio destination', () => {
        expect(parseYtDlpDestination('[ExtractAudio] Destination: track.mp3')).toBe('track.mp3');
    });
    it('reads the already-downloaded path', () => {
        expect(parseYtDlpDestination('[download] clip.mp4 has already been downloaded'))
            .toBe('clip.mp4');
    });
    it('returns null for lines that name no file', () => {
        expect(parseYtDlpDestination('[info] Downloading 1 format(s): 137+251')).toBeNull();
    });
});

describe('yt-dlp — isYtDlpNoise()', () => {
    it('drops extractor and downloader chatter', () => {
        expect(isYtDlpNoise('[youtube] abc: Downloading webpage')).toBe(true);
        expect(isYtDlpNoise('[info] Downloading 1 format(s): 137+251')).toBe(true);
        expect(isYtDlpNoise('   ')).toBe(true);
    });
    it('keeps errors, which are the reason a transfer failed', () => {
        expect(isYtDlpNoise('ERROR: Video unavailable')).toBe(false);
    });
});

describe('yt-dlp — describeYtDlpExit()', () => {
    it('names the common exit codes', () => {
        expect(describeYtDlpExit(0)).toBe('completed');
        expect(describeYtDlpExit(1)).toContain('download failed');
        expect(describeYtDlpExit(2)).toBe('bad command-line option');
        expect(describeYtDlpExit(100)).toContain('Python');
        expect(describeYtDlpExit(101)).toContain('stopped early');
        expect(describeYtDlpExit(null)).toBe('terminated by signal');
    });
    it('falls back to the raw code', () => {
        expect(describeYtDlpExit(42)).toBe('exit code 42');
    });
});

// ─── Binary discovery ─────────────────────────────────────────────────────────

describe('yt-dlp — binary naming', () => {
    it('adds .exe on Windows only', () => {
        expect(ytDlpExecutableName('linux')).toBe('yt-dlp');
        expect(ytDlpExecutableName('win32')).toBe('yt-dlp.exe');
    });
    it('maps node platform/arch onto Rust target triples', () => {
        expect(hostTargetTriple('linux', 'x64')).toBe('x86_64-unknown-linux-gnu');
        expect(hostTargetTriple('darwin', 'arm64')).toBe('aarch64-apple-darwin');
        expect(hostTargetTriple('win32', 'x64')).toBe('x86_64-pc-windows-msvc');
        expect(hostTargetTriple('linux', 'ppc64')).toBeNull();
    });
    it('offers the installed name and the dev-time sidecar name', () => {
        expect(ytDlpBinaryNames('linux', 'x64'))
            .toEqual(['yt-dlp', 'yt-dlp-x86_64-unknown-linux-gnu']);
        expect(ytDlpBinaryNames('win32', 'x64'))
            .toEqual(['yt-dlp.exe', 'yt-dlp-x86_64-pc-windows-msvc.exe']);
    });
    it('falls back to the plain name on an unmapped architecture', () => {
        expect(ytDlpBinaryNames('linux', 'ppc64')).toEqual(['yt-dlp']);
    });
});

describe('yt-dlp — search paths', () => {
    const saved = { ...process.env };
    afterEach(() => {
        process.env.GRAB_YTDLP_DIR = saved.GRAB_YTDLP_DIR;
        process.env.TAURI_RESOURCE_DIR = saved.TAURI_RESOURCE_DIR;
        process.env.GRAB_YTDLP_PATH = saved.GRAB_YTDLP_PATH;
        if (saved.GRAB_YTDLP_DIR === undefined) delete process.env.GRAB_YTDLP_DIR;
        if (saved.TAURI_RESOURCE_DIR === undefined) delete process.env.TAURI_RESOURCE_DIR;
        if (saved.GRAB_YTDLP_PATH === undefined) delete process.env.GRAB_YTDLP_PATH;
    });

    it('defaults the managed directory under the home directory', () => {
        delete process.env.GRAB_YTDLP_DIR;
        expect(managedBinDirectory()).toMatch(/[\\/]\.grab-url[\\/]bin$/);
    });
    it('lets GRAB_YTDLP_DIR redirect it', () => {
        process.env.GRAB_YTDLP_DIR = '/opt/grab/bin';
        expect(managedBinDirectory()).toBe('/opt/grab/bin');
    });
    it('searches a Tauri resource directory first', () => {
        process.env.TAURI_RESOURCE_DIR = '/app/resources';
        const dirs = bundledSearchDirectories();
        expect(dirs[0]).toBe('/app/resources');
        expect(dirs[1]).toBe('/app/resources/binaries');
    });
    it('always searches beside the host executable', () => {
        delete process.env.TAURI_RESOURCE_DIR;
        expect(bundledSearchDirectories()).toContain(
            (process.execPath.match(/^(.*)[\\/][^\\/]+$/) as RegExpMatchArray)[1],
        );
    });
});

describe('yt-dlp — probeYtDlp()', () => {
    it('returns null for a binary that is not there', () => {
        expect(probeYtDlp('/nonexistent/definitely-not-yt-dlp')).toBeNull();
    });
    it('returns null for a command that is not yt-dlp', () => {
        expect(probeYtDlp('false')).toBeNull();
    });
});

describe('yt-dlp — findYtDlp()', () => {
    const saved = process.env.GRAB_YTDLP_PATH;
    afterEach(() => {
        if (saved === undefined) delete process.env.GRAB_YTDLP_PATH;
        else process.env.GRAB_YTDLP_PATH = saved;
    });

    it('falls through a broken GRAB_YTDLP_PATH instead of failing outright', () => {
        process.env.GRAB_YTDLP_PATH = '/nonexistent/definitely-not-yt-dlp';
        const found = findYtDlp();
        expect(found?.source).not.toBe('env');
    });
});

describe('yt-dlp — ytDlpInstallHint()', () => {
    it('leads with the bundled installer', () => {
        expect(ytDlpInstallHint()).toContain('--install-ytdlp');
    });
});

// ─── Installer script ─────────────────────────────────────────────────────────

describe('install-yt-dlp — parseArgs()', () => {
    it('reads boolean flags', () => {
        const options = parseArgs(['--force', '--sidecar']);
        expect(options.force).toBe(true);
        expect(options.sidecar).toBe(true);
        expect(options.postinstall).toBe(false);
    });
    it('reads space-separated values', () => {
        expect(parseArgs(['--target', 'aarch64-apple-darwin']).target)
            .toBe('aarch64-apple-darwin');
    });
    it('reads --name=value values', () => {
        expect(parseArgs(['--out-dir=src-tauri/binaries']).outDir).toBe('src-tauri/binaries');
    });
    it('reads the exact --out path a wrapper substitutes', () => {
        expect(parseArgs(['--out', '/b/yt-dlp-x86_64-unknown-linux-gnu']).out)
            .toBe('/b/yt-dlp-x86_64-unknown-linux-gnu');
    });
    it('does not swallow the next flag as a value', () => {
        expect(parseArgs(['--dir', '--force']).dir).toBeNull();
    });
});

describe('install-yt-dlp — releaseAssetName()', () => {
    it('picks the standalone build for each mainstream platform', () => {
        expect(releaseAssetName('win32', 'x64')).toBe('yt-dlp.exe');
        expect(releaseAssetName('win32', 'ia32')).toBe('yt-dlp_x86.exe');
        expect(releaseAssetName('darwin', 'arm64')).toBe('yt-dlp_macos');
        expect(releaseAssetName('linux', 'x64')).toBe('yt-dlp_linux');
        expect(releaseAssetName('linux', 'arm64')).toBe('yt-dlp_linux_aarch64');
        expect(releaseAssetName('linux', 'arm')).toBe('yt-dlp_linux_armv7l');
    });
    it('falls back to the python build elsewhere', () => {
        expect(releaseAssetName('linux', 'ppc64')).toBe('yt-dlp');
        expect(releaseAssetName('freebsd', 'x64')).toBe('yt-dlp');
    });
});

describe('install-yt-dlp — tripleFromSidecarPath()', () => {
    it('reads the triple back out of a Tauri sidecar path', () => {
        expect(tripleFromSidecarPath('/b/binaries/yt-dlp-x86_64-unknown-linux-gnu'))
            .toBe('x86_64-unknown-linux-gnu');
        expect(tripleFromSidecarPath('C:\\b\\yt-dlp-x86_64-pc-windows-msvc.exe'))
            .toBe('x86_64-pc-windows-msvc');
    });
    it('returns null when the name carries no triple', () => {
        expect(tripleFromSidecarPath('/b/yt-dlp')).toBeNull();
        expect(tripleFromSidecarPath('/b/something-else')).toBeNull();
    });
});

describe('install-yt-dlp — assetForTriple()', () => {
    it('maps the triples a Tauri build targets', () => {
        expect(assetForTriple('x86_64-unknown-linux-gnu')).toBe('yt-dlp_linux');
        expect(assetForTriple('aarch64-unknown-linux-gnu')).toBe('yt-dlp_linux_aarch64');
        expect(assetForTriple('aarch64-apple-darwin')).toBe('yt-dlp_macos');
        expect(assetForTriple('x86_64-apple-darwin')).toBe('yt-dlp_macos');
        expect(assetForTriple('x86_64-pc-windows-msvc')).toBe('yt-dlp.exe');
        expect(assetForTriple('i686-pc-windows-msvc')).toBe('yt-dlp_x86.exe');
    });
    it('handles the non-glibc and 32-bit ARM Linux triples', () => {
        // These are exactly the hosts a process.arch mapping gets wrong, which
        // is why the triple is read back from the path rather than re-derived.
        expect(assetForTriple('x86_64-unknown-linux-musl')).toBe('yt-dlp_linux');
        expect(assetForTriple('aarch64-unknown-linux-musl')).toBe('yt-dlp_linux_aarch64');
        expect(assetForTriple('armv7-unknown-linux-gnueabihf')).toBe('yt-dlp_linux_armv7l');
    });
});

describe('install-yt-dlp — platform mapping matches the runtime finder', () => {
    it('agrees on target triples', () => {
        for (const [platform, arch] of [
            ['linux', 'x64'], ['linux', 'arm64'], ['darwin', 'x64'],
            ['darwin', 'arm64'], ['win32', 'x64'], ['linux', 'ppc64'],
        ] as const) {
            expect(targetTriple(platform, arch)).toBe(hostTargetTriple(platform, arch));
        }
    });
    it('agrees on executable names', () => {
        expect(executableName('win32')).toBe(ytDlpExecutableName('win32'));
        expect(executableName('linux')).toBe(ytDlpExecutableName('linux'));
    });
});
