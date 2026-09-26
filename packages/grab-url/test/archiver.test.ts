/**
 * @file archiver.test.ts
 * @description Unit tests for the archiver-web `extract` and `compress` functions.
 * Uses JSZip directly (pure JS, no WASM) so no mocking needed.
 */

import { describe, it, expect } from 'vitest';
import { extract, compress, detectArchiveKind } from '../../archiver-web/src/index.ts';

// ─── helpers ─────────────────────────────────────────────────────────────────

async function makeZipBuffer(files: Record<string, string | Uint8Array>): Promise<ArrayBuffer> {
  const result = await compress({
    files: Object.entries(files).map(([path, content]) => ({ path, content })),
    outputName: 'test.zip',
  });
  return result.blob.arrayBuffer();
}

// ─── extract() ───────────────────────────────────────────────────────────────

describe('extract()', () => {
  it('throws when no archiveBuffer is provided', async () => {
    await expect(
      extract({ archiveBuffer: null as unknown as ArrayBuffer })
    ).rejects.toThrow('Must provide archiveBuffer');
  });

  it('extracts all root files when folderPath is empty string', async () => {
    const buf = await makeZipBuffer({
      'readme.md': '# Hello',
      'index.ts': 'export {}',
    });

    const result = await extract({ archiveBuffer: buf });

    expect(result).toHaveLength(2);
    const paths = result.map(f => f.path).sort();
    expect(paths).toEqual(['index.ts', 'readme.md']);
    expect(result.find(f => f.path === 'readme.md')?.content).toBe('# Hello');
    expect(result.find(f => f.path === 'index.ts')?.content).toBe('export {}');
  });

  it('filters files by folderPath prefix', async () => {
    const buf = await makeZipBuffer({
      'src/index.ts': 'export {}',
      'src/utils.ts': 'export const x = 1',
      'readme.md': '# Hello',
    });

    const result = await extract({
      archiveBuffer: buf,
      folderPath: 'src/',
    });

    expect(result).toHaveLength(2);
    expect(result.every(f => !f.path.startsWith('src/'))).toBe(true);
    expect(result.map(f => f.path).sort()).toEqual(['index.ts', 'utils.ts']);
  });

  it('throws when password is provided', async () => {
    const buf = await makeZipBuffer({});

    await expect(
      extract({ archiveBuffer: buf, password: 's3cr3t' })
    ).rejects.toThrow('Password-protected archives are not supported');
  });

  it('populates size correctly for each file', async () => {
    const buf = await makeZipBuffer({
      'notes.md': 'hello world',
    });

    const result = await extract({ archiveBuffer: buf });
    expect(result[0].size).toBe('hello world'.length);
  });

  it('returns empty array when archive has no files', async () => {
    const buf = await makeZipBuffer({});

    const result = await extract({ archiveBuffer: buf });
    expect(result).toHaveLength(0);
  });

  it('handles binary content', async () => {
    const bytes = new Uint8Array([0x00, 0xff, 0x10, 0xab]);
    const buf = await makeZipBuffer({ 'data.bin': bytes });

    const result = await extract({ archiveBuffer: buf });
    expect(result).toHaveLength(1);
    expect(result[0].size).toBe(4);
  });
});

// ─── compress() ──────────────────────────────────────────────────────────────

describe('compress()', () => {
  it('returns a blob, mime type, and downloadName', async () => {
    const result = await compress({
      files: [{ path: 'hello.txt', content: 'Hello World' }],
      outputName: 'archive.zip',
    });

    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.mime).toBe('application/zip');
    expect(result.downloadName).toBe('archive.zip');
  });

  it('creates a valid zip that can be extracted', async () => {
    const result = await compress({
      files: [
        { path: 'a.txt', content: 'AAA' },
        { path: 'b.txt', content: 'BBB' },
      ],
      outputName: 'out.zip',
    });

    const buf = await result.blob.arrayBuffer();
    const extracted = await extract({ archiveBuffer: buf });
    expect(extracted).toHaveLength(2);
    expect(extracted.find(f => f.path === 'a.txt')?.content).toBe('AAA');
    expect(extracted.find(f => f.path === 'b.txt')?.content).toBe('BBB');
  });

  it('handles Uint8Array content', async () => {
    const result = await compress({
      files: [{ path: 'bytes.bin', content: new Uint8Array([1, 2, 3]) }],
      outputName: 'out.zip',
    });

    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.size).toBeGreaterThan(0);
  });

  it('handles ArrayBuffer content', async () => {
    const result = await compress({
      files: [{ path: 'buf.bin', content: new ArrayBuffer(4) }],
      outputName: 'out.zip',
    });

    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('handles Blob content', async () => {
    const rawBlob = new Blob(['already a blob']);
    const result = await compress({
      files: [{ path: 'blob.txt', content: rawBlob }],
      outputName: 'out.zip',
    });

    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('throws on unsupported content type', async () => {
    await expect(
      compress({
        files: [{ path: 'bad.txt', content: 12345 as unknown as string }],
        outputName: 'out.zip',
      })
    ).rejects.toThrow('Unsupported content type');
  });

  it('handles multiple files in a single call', async () => {
    const result = await compress({
      files: [
        { path: 'a.txt', content: 'AAA' },
        { path: 'b.txt', content: 'BBB' },
        { path: 'c.txt', content: 'CCC' },
      ],
      outputName: 'multi.zip',
    });

    const buf = await result.blob.arrayBuffer();
    const extracted = await extract({ archiveBuffer: buf });
    expect(extracted).toHaveLength(3);
  });
});

// ─── detectArchiveKind() ─────────────────────────────────────────────────────

describe('detectArchiveKind()', () => {
  it.each([
    ['out.zip', 'zip'],
    ['out.tar.gz', 'tar-gzip'],
    ['out.tgz', 'tar-gzip'],
    ['out.tar.bz2', 'tar-bzip2'],
    ['out.tbz2', 'tar-bzip2'],
    ['out.tbz', 'tar-bzip2'],
    ['out.tar.xz', 'tar-xz'],
    ['out.txz', 'tar-xz'],
    ['out.tar', 'tar'],
    ['out.gz', 'gzip'],
    ['out.gzip', 'gzip'],
    ['out.bz2', 'bzip2'],
    ['out.xz', 'xz'],
    ['out.7z', 'seven-zip'],
    ['out.rar', 'rar'],
    ['out.unknown', 'unknown'],
    ['OUT.ZIP', 'zip'],
  ])('maps %s to %s', (filename, kind) => {
    expect(detectArchiveKind(filename)).toBe(kind);
  });
});

// ─── zip-slip / path-traversal guard ────────────────────────────────────────

/**
 * Builds a single-entry USTAR tar buffer by hand, bypassing any writer-side
 * path sanitization, so the traversal path in the header reaches our own
 * reader (`collectLibarchiveFiles` in archiver-web) unmodified. libarchive.js
 * itself does not sanitize entry paths — see the safety notes in
 * `packages/archiver-web/.claude/CLAUDE.md`.
 */
function buildMaliciousTarBuffer(entryName: string, content: string): ArrayBuffer {
  const contentBytes = new TextEncoder().encode(content);
  const header = new Uint8Array(512);
  const writeField = (offset: number, value: string, length: number) => {
    const bytes = new TextEncoder().encode(value.slice(0, length));
    header.set(bytes, offset);
  };
  writeField(0, entryName, 100);
  writeField(100, '0000644\0', 8); // mode
  writeField(108, '0000000\0', 8); // uid
  writeField(116, '0000000\0', 8); // gid
  writeField(124, contentBytes.length.toString(8).padStart(11, '0') + '\0', 12); // size
  writeField(136, '00000000000\0', 12); // mtime
  header.set(new Uint8Array(8).fill(0x20), 148); // chksum: spaces while computing
  writeField(156, '0', 1); // typeflag: regular file
  writeField(257, 'ustar\0', 6); // magic
  writeField(263, '00', 2); // version

  let checksum = 0;
  for (let i = 0; i < 512; i++) checksum += header[i];
  writeField(148, checksum.toString(8).padStart(6, '0') + '\0 ', 8);

  const paddedContentLen = Math.ceil(contentBytes.length / 512) * 512;
  const out = new Uint8Array(512 + paddedContentLen + 1024); // + two zero end-of-archive blocks
  out.set(header, 0);
  out.set(contentBytes, 512);
  return out.buffer;
}

describe('extract() path safety', () => {
  it('drops a zip entry that tries to escape the extraction root', async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file('../../evil.txt', 'pwned');
    zip.file('ok.txt', 'fine');
    const buf = await zip.generateAsync({ type: 'arraybuffer' });

    const result = await extract({ archiveBuffer: buf });

    // JSZip itself already collapses "../../evil.txt" down to "evil.txt"
    // while parsing the zip (before our code ever sees the path) — so the
    // meaningful assertion is that nothing ever escapes the root.
    expect(result.every(f => !f.path.startsWith('..') && !f.path.includes('/../'))).toBe(true);
  });

  it('drops a tar entry that tries to escape the extraction root', async () => {
    const buf = buildMaliciousTarBuffer('../../evil.txt', 'pwned');

    const result = await extract({ archiveBuffer: buf, filename: 'archive.tar' });

    expect(result).toHaveLength(0);
  });
});

// ─── tar / tar.gz / tar.bz2 / tar.xz / standalone gzip ──────────────────────
// Exercised through libarchive.js's Node build (an optionalDependency,
// installed locally in CI) rather than the CDN.

describe('compress()/extract() beyond ZIP', () => {
  const files = [
    { path: 'a.txt', content: 'hello world' },
    { path: 'dir/b.txt', content: 'nested file' },
  ];

  it.each([
    ['out.tar', 'application/x-tar'],
    ['out.tar.gz', 'application/octet-stream'],
    ['out.tar.bz2', 'application/octet-stream'],
    ['out.tar.xz', 'application/octet-stream'],
  ])('round-trips %s', async (outputName, mime) => {
    const archive = await compress({ files, outputName });
    expect(archive.mime).toBe(mime);
    expect(archive.blob.size).toBeGreaterThan(0);

    const buf = await archive.blob.arrayBuffer();
    const extracted = await extract({ archiveBuffer: buf, filename: outputName });

    expect(extracted).toHaveLength(2);
    expect(extracted.find(f => f.path === 'a.txt')?.content).toBe('hello world');
    expect(extracted.find(f => f.path === 'dir/b.txt')?.content).toBe('nested file');
  });

  it('round-trips a standalone .gz (single file)', async () => {
    const archive = await compress({
      files: [{ path: 'only.txt', content: 'solo content' }],
      outputName: 'only.gz',
    });

    const buf = await archive.blob.arrayBuffer();
    const extracted = await extract({ archiveBuffer: buf, filename: 'only.gz' });

    expect(extracted).toHaveLength(1);
    expect(extracted[0].content).toBe('solo content');
  });

  it('throws for a multi-file standalone .gz', async () => {
    await expect(
      compress({
        files: [
          { path: 'a.txt', content: '1' },
          { path: 'b.txt', content: '2' },
        ],
        outputName: 'multi.gz',
      })
    ).rejects.toThrow('holds exactly one compressed file');
  });

  it('throws creating a .rar (proprietary, extraction-only)', async () => {
    await expect(
      compress({ files: [{ path: 'a.txt', content: '1' }], outputName: 'out.rar' })
    ).rejects.toThrow('RAR archive creation is not supported');
  });

  it('throws creating a .7z (libarchive.js cannot write one)', async () => {
    await expect(
      compress({ files: [{ path: 'a.txt', content: '1' }], outputName: 'out.7z' })
    ).rejects.toThrow('7z archive creation is not supported');
  });

  it('throws reading a standalone .bz2 (not inside a tar)', async () => {
    const archive = await compress({
      files: [{ path: 'only.txt', content: 'solo content' }],
      outputName: 'only.bz2',
    });
    const buf = await archive.blob.arrayBuffer();

    await expect(
      extract({ archiveBuffer: buf, filename: 'only.bz2' })
    ).rejects.toThrow('not supported');
  });
});
