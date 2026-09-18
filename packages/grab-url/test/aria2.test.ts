/**
 * @file aria2.test.ts
 * @description Unit tests for the aria2c-backed transfer layer (sftp, torrent,
 * magnet) and for background-job handling:
 *   - transfer/aria2-transfer.ts  (target detection, arg building, readout parsing)
 *   - background.ts               (argv rewriting, job registry, log paths)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
    classifyAria2Target,
    isAria2Target,
    describeAria2Target,
    buildAria2Args,
    parseAria2Size,
    parseAria2Eta,
    parseAria2Progress,
    describeAria2Exit,
    aria2InstallHint,
    parseAria2Features,
    supportsKind,
    redactCredentials,
    isAria2Noise,
} from '../../grab-url-cli/src/transfer/aria2-transfer.ts';

import {
    BACKGROUND_CHILD_FLAG,
    buildChildArgv,
    isBackgroundChild,
    buildLogPath,
    getJobsDirectory,
    getLogsDirectory,
    writeJobRecord,
    listJobs,
    isProcessAlive,
} from '../../grab-url-cli/src/background.ts';

// ─── Target detection ─────────────────────────────────────────────────────────

describe('aria2 — classifyAria2Target()', () => {
    it('detects magnet URIs', () => {
        expect(classifyAria2Target('magnet:?xt=urn:btih:abc123&dn=ubuntu.iso')).toBe('magnet');
    });
    it('detects sftp URLs', () => {
        expect(classifyAria2Target('sftp://user@host/srv/backup.tar.gz')).toBe('sftp');
    });
    it('detects remote .torrent files', () => {
        expect(classifyAria2Target('https://example.com/ubuntu.torrent')).toBe('torrent');
    });
    it('detects local .torrent paths', () => {
        expect(classifyAria2Target('./downloads/ubuntu.torrent')).toBe('torrent');
    });
    it('ignores the query string when matching .torrent', () => {
        expect(classifyAria2Target('https://example.com/x.torrent?token=1')).toBe('torrent');
    });
    it('returns null for plain http(s) URLs', () => {
        expect(classifyAria2Target('https://example.com/file.iso')).toBeNull();
    });
    it('returns null for empty input', () => {
        expect(classifyAria2Target('')).toBeNull();
    });
    it('isAria2Target mirrors classifyAria2Target', () => {
        expect(isAria2Target('sftp://host/f.bin')).toBe(true);
        expect(isAria2Target('https://host/f.bin')).toBe(false);
    });
});

describe('aria2 — describeAria2Target()', () => {
    it('uses the magnet display-name when present', () => {
        expect(describeAria2Target('magnet:?xt=urn:btih:abc&dn=ubuntu+24.04.iso', 'magnet'))
            .toBe('ubuntu 24.04.iso');
    });
    it('falls back to the info hash for nameless magnets', () => {
        expect(describeAria2Target('magnet:?xt=urn:btih:abcdef0123456789', 'magnet'))
            .toContain('abcdef012345');
    });
    it('uses the basename for torrents', () => {
        expect(describeAria2Target('https://example.com/a/ubuntu.torrent', 'torrent')).toBe('ubuntu.torrent');
    });
    it('uses the basename for sftp paths', () => {
        expect(describeAria2Target('sftp://user@host/srv/backup.tar.gz', 'sftp')).toBe('backup.tar.gz');
    });
});

// ─── Argument building ────────────────────────────────────────────────────────

describe('aria2 — buildAria2Args()', () => {
    it('always requests a parsable readout and resume', () => {
        const args = buildAria2Args('sftp://host/f.bin', 'sftp', { dir: '/tmp' });
        expect(args).toContain('--summary-interval=1');
        expect(args).toContain('--human-readable=false');
        expect(args).toContain('--continue=true');
        expect(args).toContain('--dir=/tmp');
    });
    it('puts the target last', () => {
        const args = buildAria2Args('sftp://host/f.bin', 'sftp', {});
        expect(args[args.length - 1]).toBe('sftp://host/f.bin');
    });
    it('passes sftp credentials and host key', () => {
        const args = buildAria2Args('sftp://host/f.bin', 'sftp', {
            user: 'alice', password: 'hunter2', sshHostKey: 'sha-1=abc',
        });
        expect(args).toContain('--ftp-user=alice');
        expect(args).toContain('--ftp-passwd=hunter2');
        expect(args).toContain('--ssh-host-key-md=sha-1=abc');
    });
    it('clamps the connection count to 1..16', () => {
        expect(buildAria2Args('sftp://h/f', 'sftp', { connections: 99 })).toContain('--split=16');
        expect(buildAria2Args('sftp://h/f', 'sftp', { connections: 0 })).toContain('--split=1');
    });
    it('renames sftp output with --out when -o is given', () => {
        const args = buildAria2Args('sftp://host/f.bin', 'sftp', { output: '/downloads/renamed.bin' });
        expect(args).toContain('--out=renamed.bin');
    });
    it('stops seeding torrents by default', () => {
        const args = buildAria2Args('x.torrent', 'torrent', {});
        expect(args).toContain('--seed-time=0');
        expect(args).not.toContain('--seed-ratio=0.0');
    });
    it('keeps seeding when --seed is set', () => {
        const args = buildAria2Args('x.torrent', 'torrent', { seed: true });
        expect(args).toContain('--seed-ratio=0.0');
        expect(args).not.toContain('--seed-time=0');
    });
    it('saves metadata for magnet links', () => {
        const args = buildAria2Args('magnet:?xt=urn:btih:abc', 'magnet', {});
        expect(args).toContain('--bt-save-metadata=true');
        expect(args).toContain('--follow-torrent=true');
    });
    it('never sends sftp-only flags for torrents', () => {
        const args = buildAria2Args('x.torrent', 'torrent', { user: 'alice' });
        expect(args.some(a => a.startsWith('--ftp-user'))).toBe(false);
    });
    it('appends extra aria2 flags verbatim before the target', () => {
        const args = buildAria2Args('x.torrent', 'torrent', { extraArgs: ['--max-overall-download-limit=1M'] });
        expect(args[args.length - 2]).toBe('--max-overall-download-limit=1M');
    });
});

// ─── Readout parsing ──────────────────────────────────────────────────────────

describe('aria2 — parseAria2Size()', () => {
    it('reads raw byte counts', () => expect(parseAria2Size('4096')).toBe(4096));
    it('reads KiB', () => expect(parseAria2Size('400KiB')).toBe(409600));
    it('reads MiB with decimals', () => expect(parseAria2Size('33.2MiB')).toBe(Math.round(33.2 * 1024 ** 2)));
    it('reads GiB', () => expect(parseAria2Size('1.4GiB')).toBe(Math.round(1.4 * 1024 ** 3)));
    it('returns 0 for missing or junk input', () => {
        expect(parseAria2Size(undefined)).toBe(0);
        expect(parseAria2Size('n/a')).toBe(0);
    });
});

describe('aria2 — parseAria2Eta()', () => {
    it('reads seconds', () => expect(parseAria2Eta('45s')).toBe(45));
    it('reads minutes and seconds', () => expect(parseAria2Eta('4m51s')).toBe(291));
    it('reads hours', () => expect(parseAria2Eta('1h2m3s')).toBe(3723));
    it('reads days', () => expect(parseAria2Eta('2d3h')).toBe(2 * 86400 + 3 * 3600));
    it('returns 0 for missing input', () => expect(parseAria2Eta(null)).toBe(0));
});

describe('aria2 — parseAria2Progress()', () => {
    it('parses a human-readable http/sftp readout', () => {
        const p = parseAria2Progress('[#2089b0 400KiB/33.2MiB(1%) CN:1 DL:115KiB ETA:4m51s]')!;
        expect(p.gid).toBe('2089b0');
        expect(p.downloaded).toBe(409600);
        expect(p.percent).toBe(1);
        expect(p.speedBps).toBe(115 * 1024);
        expect(p.etaSeconds).toBe(291);
        expect(p.connections).toBe(1);
        expect(p.seeders).toBeNull();
        expect(p.seeding).toBe(false);
    });
    it('parses the byte-suffixed readout aria2 1.37 emits with --human-readable=false', () => {
        const p = parseAria2Progress('[#fa63e7 409600B/3145728B(13%) CN:1 SD:0 DL:208990B ETA:13s]')!;
        expect(p.downloaded).toBe(409600);
        expect(p.total).toBe(3145728);
        expect(p.speedBps).toBe(208990);
        expect(p.seeders).toBe(0);
        expect(p.etaSeconds).toBe(13);
    });
    it('parses the raw-byte readout produced by --human-readable=false', () => {
        const p = parseAria2Progress('[#a1b2c3 409600/34865152(1%) CN:5 DL:118477 ETA:4m]')!;
        expect(p.downloaded).toBe(409600);
        expect(p.total).toBe(34865152);
        expect(p.speedBps).toBe(118477);
        expect(p.etaSeconds).toBe(240);
    });
    it('parses torrent readouts with seeders and upload', () => {
        const p = parseAria2Progress('[#7d3d4e 12MiB/1.4GiB(0%) CN:34 SD:5 DL:2.4MiB UL:512KiB ETA:9m]')!;
        expect(p.seeders).toBe(5);
        expect(p.connections).toBe(34);
        expect(p.uploadBps).toBe(512 * 1024);
    });
    it('flags the seeding phase', () => {
        const p = parseAria2Progress('[#2089b0 SEED(1.0) CN:1 SD:2]')!;
        expect(p.seeding).toBe(true);
        expect(p.percent).toBe(100);
        expect(p.seeders).toBe(2);
    });
    it('returns null for log lines', () => {
        expect(parseAria2Progress('09/09 04:11:22 [NOTICE] Downloading 1 item(s)')).toBeNull();
        expect(parseAria2Progress('')).toBeNull();
    });
    it('returns null for bracketed lines without stats', () => {
        expect(parseAria2Progress('[MEMORY] CUID#7 - Dumping memory')).toBeNull();
    });
});

describe('aria2 — describeAria2Exit()', () => {
    it('names known exit codes', () => {
        expect(describeAria2Exit(0)).toBe('completed');
        expect(describeAria2Exit(3)).toContain('not found');
        expect(describeAria2Exit(9)).toContain('disk space');
    });
    it('falls back to the raw code', () => expect(describeAria2Exit(99)).toContain('99'));
    it('reports signal termination', () => expect(describeAria2Exit(null)).toContain('signal'));
    it('always offers an install hint', () => expect(aria2InstallHint().length).toBeGreaterThan(0));
});

describe('aria2 — build capabilities', () => {
    const versionOutput = [
        'aria2 version 1.37.0',
        'Enabled Features: Async DNS, BitTorrent, GZip, HTTPS, Metalink, XML-RPC, SFTP',
        'Libraries: zlib/1.3 libssh2/1.11.0',
    ].join('\n');

    it('reads the enabled feature list', () => {
        expect(parseAria2Features(versionOutput)).toContain('SFTP');
        expect(parseAria2Features(versionOutput)).toContain('BitTorrent');
    });
    it('returns an empty list when the line is absent', () => {
        expect(parseAria2Features('aria2 version 1.37.0')).toEqual([]);
    });
    it('accepts kinds the build supports', () => {
        const features = parseAria2Features(versionOutput);
        expect(supportsKind(features, 'sftp')).toBe(true);
        expect(supportsKind(features, 'magnet')).toBe(true);
    });
    it('rejects kinds the build lacks', () => {
        expect(supportsKind(['Async DNS', 'HTTPS'], 'sftp')).toBe(false);
        expect(supportsKind(['SFTP'], 'torrent')).toBe(false);
    });
    it('assumes support when the build is unknown', () => {
        expect(supportsKind([], 'sftp')).toBe(true);
    });
});

describe('aria2 — output hygiene', () => {
    it('redacts sftp passwords', () => {
        expect(redactCredentials('sftp://alice:hunter2@host/f.bin')).toBe('sftp://alice:***@host/f.bin');
    });
    it('redacts passwords inside longer log lines', () => {
        const line = 'Download aborted. URI=sftp://alice:hunter2@host:22/srv/f.bin';
        expect(redactCredentials(line)).toContain('alice:***@host');
        expect(redactCredentials(line)).not.toContain('hunter2');
    });
    it('leaves credential-free URLs alone', () => {
        expect(redactCredentials('https://example.com/f.iso')).toBe('https://example.com/f.iso');
    });
    it('treats banner and legend lines as noise', () => {
        expect(isAria2Noise('Download Results:')).toBe(true);
        expect(isAria2Noise('gid   |stat|avg speed  |  %|path/URI')).toBe(true);
        expect(isAria2Noise('======+====+====')).toBe(true);
        expect(isAria2Noise('(OK):download completed.')).toBe(true);
        expect(isAria2Noise('FILE: /tmp/out/secret.bin')).toBe(true);
    });
    it('keeps the lines that explain a failure', () => {
        expect(isAria2Noise('-> [SocketCore.cc:1069] Unexpected SSH host key: expected a, actual b')).toBe(false);
        expect(isAria2Noise('09/09 04:38 [ERROR] CUID#7 - Download aborted.')).toBe(false);
    });
});

// ─── Background jobs ──────────────────────────────────────────────────────────

describe('background — buildChildArgv()', () => {
    it('drops --background and marks the child', () => {
        const argv = buildChildArgv(['https://x/f.iso', '--background']);
        expect(argv).toEqual(['https://x/f.iso', BACKGROUND_CHILD_FLAG]);
    });
    it('drops the -b alias too', () => {
        expect(buildChildArgv(['-b', 'https://x/f.iso'])).toEqual(['https://x/f.iso', BACKGROUND_CHILD_FLAG]);
    });
    it('never stacks the child marker twice', () => {
        const once = buildChildArgv(['https://x/f.iso', '--background']);
        const twice = buildChildArgv(once);
        expect(twice.filter(a => a === BACKGROUND_CHILD_FLAG)).toHaveLength(1);
    });
    it('keeps every other flag', () => {
        const argv = buildChildArgv(['sftp://h/f', '-b', '-d', './out', '--seed']);
        expect(argv).toContain('-d');
        expect(argv).toContain('./out');
        expect(argv).toContain('--seed');
    });
    it('isBackgroundChild detects the marker', () => {
        expect(isBackgroundChild(['node', 'grab', BACKGROUND_CHILD_FLAG])).toBe(true);
        expect(isBackgroundChild(['node', 'grab', 'https://x/f'])).toBe(false);
    });
});

describe('background — job registry', () => {
    let stateDir: string;

    beforeEach(() => {
        stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grab-jobs-'));
    });
    afterEach(() => {
        try { fs.rmSync(stateDir, { recursive: true, force: true }); } catch { }
    });

    it('derives log paths under <stateDir>/logs', () => {
        const logPath = buildLogPath(stateDir, ['https://example.com/ubuntu.iso?x=1']);
        expect(path.dirname(logPath)).toBe(getLogsDirectory(stateDir));
        expect(path.basename(logPath)).toContain('ubuntu.iso');
        expect(logPath.endsWith('.log')).toBe(true);
    });

    it('lists a job whose process is alive', () => {
        writeJobRecord(stateDir, {
            pid: process.pid,
            urls: ['https://example.com/a.iso'],
            log: path.join(stateDir, 'a.log'),
            cwd: stateDir,
            started: new Date().toISOString(),
            reason: 'flag',
        });
        const jobs = listJobs(stateDir);
        expect(jobs).toHaveLength(1);
        expect(jobs[0].urls[0]).toBe('https://example.com/a.iso');
    });

    it('prunes records whose process has exited', () => {
        const deadPid = 2 ** 22 - 1; // above any real pid on Linux defaults
        writeJobRecord(stateDir, {
            pid: deadPid,
            urls: ['https://example.com/b.iso'],
            log: path.join(stateDir, 'b.log'),
            cwd: stateDir,
            started: new Date().toISOString(),
            reason: 'cancel',
        });
        expect(listJobs(stateDir)).toHaveLength(0);
        expect(fs.existsSync(path.join(getJobsDirectory(stateDir), `${deadPid}.json`))).toBe(false);
    });

    it('returns an empty list when nothing was ever registered', () => {
        expect(listJobs(stateDir)).toEqual([]);
    });

    it('isProcessAlive recognises this process', () => {
        expect(isProcessAlive(process.pid)).toBe(true);
    });
});
