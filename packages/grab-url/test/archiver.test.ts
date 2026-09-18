/**
 * @file archiver.test.ts
 * @description Unit tests for the archiver-web `extract` and `compress` functions.
 * Uses JSZip directly (pure JS, no WASM) so no mocking needed.
 */

import { describe, it, expect } from 'vitest';
import { extract, compress } from '../../archiver-web/src/index.ts';

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
