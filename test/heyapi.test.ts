/**
 * @file heyapi.test.ts
 * @description Unit tests for the Hey API client backed by grab().
 * Runs in Node (Vitest) with fetch stubbed out.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { grab } from '../packages/grab-api/src/index.js';
import {
  createClient,
  createConfig,
  rewireGeneratedClient,
} from '../packages/heyapi-client-grab/src/index.js';

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/** Queues a JSON response for the next request. */
function mockJson(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

/** The URL the last request was sent to. */
const lastUrl = () => mockFetch.mock.calls.at(-1)?.[0] as string;

/** The fetch init of the last request. */
const lastInit = () => mockFetch.mock.calls.at(-1)?.[1] as RequestInit;

const BASE = 'https://api.example.com';

const client = createClient(createConfig({ baseUrl: BASE, debug: false }));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  grab.log = [];
  grab.mock = {};
  grab.defaults = {};
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Requests ─────────────────────────────────────────────────────────────────

describe('grab-powered Hey API client', () => {
  it('sends a GET through grab and returns data, request and response', async () => {
    mockJson({ id: '42', name: 'Rex' });

    const result = await client.get<{ id: string; name: string }>({
      path: { petId: '42' },
      query: { verbose: true },
      url: '/pets/{petId}',
    });

    expect(lastUrl()).toBe(`${BASE}/pets/42?verbose=true`);
    expect(lastInit().method).toBe('GET');
    expect(result.data).toEqual({ id: '42', name: 'Rex' });
    expect(result.error).toBeUndefined();
    expect(result.response?.status).toBe(200);
    expect(result.request?.url).toBe(`${BASE}/pets/42?verbose=true`);
  });

  it('serializes a POST body as JSON', async () => {
    mockJson({ id: '1' }, 201);

    const result = await client.post({ body: { name: 'Rex' }, url: '/pets' });

    expect(lastInit().method).toBe('POST');
    expect(await new Response(lastInit().body as BodyInit).text()).toBe(
      JSON.stringify({ name: 'Rex' }),
    );
    expect(result.response?.status).toBe(201);
    expect(result.data).toEqual({ id: '1' });
  });

  it('sends no body at all for a bodyless POST', async () => {
    mockJson({ ok: true });

    await client.post({ url: '/pets/1/like' });

    expect(lastInit().method).toBe('POST');
    expect(lastInit().body).toBeNull();
  });

  it('keeps grab utility options out of the query string', async () => {
    mockJson({ ok: true });

    await client.get({
      cacheForTime: 120,
      retryAttempts: 0,
      url: '/pets',
    });

    expect(lastUrl()).toBe(`${BASE}/pets`);
  });

  it('returns an empty object for a 204', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await client.delete({ url: '/pets/1' });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({});
    expect(result.response?.status).toBe(204);
  });

  it('returns only the payload when responseStyle is data', async () => {
    mockJson({ id: '7' });

    const result = await client.get({ responseStyle: 'data', url: '/pets/7' });

    expect(result).toEqual({ id: '7' });
  });
});

// ─── Errors ───────────────────────────────────────────────────────────────────

describe('error handling', () => {
  it('returns the parsed error body with the failing status', async () => {
    mockJson({ message: 'Pet not found' }, 404);

    const result = await client.get({ url: '/pets/none' });

    expect(result.data).toBeUndefined();
    expect(result.error).toEqual({ message: 'Pet not found' });
    expect(result.response?.status).toBe(404);
  });

  it('falls back to the raw text when the error body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('nope', { status: 500, headers: { 'Content-Type': 'text/plain' } }),
    );

    const result = await client.get({ url: '/pets' });

    expect(result.error).toBe('nope');
  });

  it('throws the error when throwOnError is set', async () => {
    mockJson({ message: 'Denied' }, 403);

    await expect(
      client.get({ throwOnError: true, url: '/pets' }),
    ).rejects.toEqual({ message: 'Denied' });
  });

  it('reports a transport failure as an error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network down'));

    const result = await client.get({ url: '/pets' });

    expect(result.data).toBeUndefined();
    expect(result.error).toContain('Network down');
  });
});

// ─── grab features ────────────────────────────────────────────────────────────

describe('grab features reaching generated SDKs', () => {
  it('answers from grab.mock without hitting the network', async () => {
    grab.mock['/pets'] = { response: { pets: ['Rex'] } };

    const result = await client.get({ url: '/pets' });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.data).toEqual({ pets: ['Rex'] });
    expect(result.response?.status).toBe(200);
  });

  it('retries a failed request when retryAttempts is set', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network down'));
    mockJson({ id: '1' });

    const result = await client.get({ retryAttempts: 1, url: '/pets/1' });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ id: '1' });
  });

  it('sends no unknown options to a grab that predates onRawResponse', async () => {
    const supports = grab.supports;
    delete (grab as any).supports;

    try {
      mockJson({ id: '1' });
      const result = await client.get({ cacheForTime: 120, url: '/pets/1' });

      // No option leaks into the query string, and data still comes back.
      expect(lastUrl()).toBe(`${BASE}/pets/1`);
      expect(result.data).toEqual({ id: '1' });

      // Without the hook a failure reports grab's message, not the payload.
      mockJson({ message: 'gone' }, 404);
      const failed = await client.get({ url: '/pets/1' });
      expect(failed.error).toContain('404');
    } finally {
      (grab as any).supports = supports;
    }
  });

  it('records every request in the shared grab log', async () => {
    mockJson({ id: '1' });

    await client.get({ url: '/pets/1' });

    expect(grab.log[0].path).toBe('/pets/1');
  });
});

// ─── Auth and interceptors ────────────────────────────────────────────────────

describe('auth and interceptors', () => {
  it('applies a bearer token from the security scheme', async () => {
    mockJson({ ok: true });

    const authed = createClient(
      createConfig({ auth: () => 'secret', baseUrl: BASE, debug: false }),
    );

    await authed.get({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/pets',
    });

    expect(lastInit().headers?.authorization).toBe('Bearer secret');
  });

  it('runs request, response and error interceptors', async () => {
    const scoped = createClient(createConfig({ baseUrl: BASE, debug: false }));
    const seen: string[] = [];

    scoped.interceptors.request.use((request) => {
      seen.push('request');
      const next = new Request(request);
      next.headers.set('X-Trace', 'on');
      return next;
    });
    scoped.interceptors.response.use((response) => {
      seen.push('response');
      return response;
    });
    scoped.interceptors.error.use((error) => {
      seen.push('error');
      return { handled: error };
    });

    mockJson({ ok: true });
    await scoped.get({ url: '/pets' });
    expect(lastInit().headers?.['x-trace']).toBe('on');

    mockJson({ message: 'boom' }, 500);
    const failed = await scoped.get({ url: '/pets' });

    expect(seen).toEqual(['request', 'response', 'request', 'response', 'error']);
    expect(failed.error).toEqual({ handled: { message: 'boom' } });
  });

  it('builds a url without sending anything', () => {
    expect(
      client.buildUrl({ path: { petId: '9' }, query: { full: true }, url: '/pets/{petId}' }),
    ).toBe(`${BASE}/pets/9?full=true`);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─── Codegen rewiring ─────────────────────────────────────────────────────────

describe('rewireGeneratedClient', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'heyapi-grab-'));
  });

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true });
  });

  it('replaces the bundled client implementation', () => {
    mkdirSync(join(dir, 'client'));
    writeFileSync(join(dir, 'client', 'client.gen.ts'), 'export const createClient = () => {};');
    writeFileSync(join(dir, 'client', 'types.gen.ts'), 'export type Client = unknown;');

    const rewired = rewireGeneratedClient(dir);

    expect(rewired).toContain(join(dir, 'client', 'client.gen.ts'));
    expect(readFileSync(join(dir, 'client', 'client.gen.ts'), 'utf8')).toContain(
      'from "heyapi-client-grab"',
    );
  });

  it('repoints imports of the packaged fetch and axios clients', () => {
    writeFileSync(
      join(dir, 'client.gen.ts'),
      `import { createClient, createConfig } from '@hey-api/client-fetch';\n`,
    );
    writeFileSync(
      join(dir, 'sdk.gen.ts'),
      `import type { Options } from "@hey-api/client-axios";\n`,
    );

    const rewired = rewireGeneratedClient(dir);

    expect(rewired).toHaveLength(2);
    expect(readFileSync(join(dir, 'client.gen.ts'), 'utf8')).toContain(
      `from 'heyapi-client-grab'`,
    );
    expect(readFileSync(join(dir, 'sdk.gen.ts'), 'utf8')).toContain(
      `from "heyapi-client-grab"`,
    );
  });

  it('fails loudly when the output directory is missing', () => {
    expect(() => rewireGeneratedClient(join(dir, 'nope'))).toThrow(/No generated output/);
  });
});
