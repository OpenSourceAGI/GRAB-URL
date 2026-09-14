/**
 * @file api2client.test.ts
 * @description Unit tests for the Hey API client backed by grab().
 * Runs in Node (Vitest) with fetch stubbed out.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { grab } from '../../packages/grab-api/src/index.js';
import {
  createClient,
  createConfig,
  rewireGeneratedClient,
} from '../../packages/api2client/src/index.js';

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
  // mockReset (not just clearAllMocks) so a once-queue left over from a test
  // that errors out mid-stream never leaks its remaining entries forward.
  mockFetch.mockReset();
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

// ─── Server-sent events ───────────────────────────────────────────────────────

/** Queues a `text/event-stream` response built from raw SSE frame text. */
function mockSse(body: string, status = 200) {
  mockFetch.mockResolvedValueOnce(
    new Response(body, {
      status,
      headers: { 'Content-Type': 'text/event-stream' },
    }),
  );
}

describe('server-sent events', () => {
  it('streams parsed data events in order', async () => {
    mockSse(
      'data: {"progress":1}\n\n' + 'event: done\ndata: {"progress":2}\n\n',
    );

    const { stream } = await client.sse.get({ url: '/jobs/1/events' });

    const events: unknown[] = [];
    for await (const event of stream) events.push(event);

    expect(events).toEqual([{ progress: 1 }, { progress: 2 }]);
    const sentRequest = mockFetch.mock.calls[0]?.[0] as Request;
    expect(sentRequest.url).toBe(`${BASE}/jobs/1/events`);
    expect(sentRequest.method).toBe('GET');
  });

  it('reports event, id and retry metadata through onSseEvent', async () => {
    mockSse('event: progress\nid: 42\nretry: 5000\ndata: {"pct":50}\n\n');

    const seen: unknown[] = [];
    const { stream } = await client.sse.get({
      onSseEvent: (event) => seen.push(event),
      url: '/jobs/1/events',
    });
    for await (const _ of stream);

    expect(seen).toEqual([
      { data: { pct: 50 }, event: 'progress', id: '42', retry: 5000 },
    ]);
  });

  it('sends the Last-Event-ID header on a reconnect', async () => {
    // First connection delivers one event, then the stream itself breaks
    // (a normal end-of-stream never triggers a reconnect, only an error does).
    let pulls = 0;
    const droppedBody = new ReadableStream({
      pull(controller) {
        pulls++;
        if (pulls === 1) {
          controller.enqueue(new TextEncoder().encode('id: 1\ndata: {"n":1}\n\n'));
        } else {
          controller.error(new Error('connection reset'));
        }
      },
    });
    mockFetch.mockResolvedValueOnce(
      new Response(droppedBody, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );
    mockSse('data: {"n":2}\n\n');

    const { stream } = await client.sse.get({
      sseSleepFn: () => Promise.resolve(),
      url: '/jobs/1/events',
    });

    const events: unknown[] = [];
    for await (const event of stream) events.push(event);

    expect(events).toEqual([{ n: 1 }, { n: 2 }]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect((mockFetch.mock.calls[1]?.[0] as Request).headers.get('Last-Event-ID')).toBe('1');
  });

  it('gives up after sseMaxRetryAttempts and reports the error', async () => {
    mockFetch.mockRejectedValue(new Error('down'));

    const errors: unknown[] = [];
    const { stream } = await client.sse.get({
      onSseError: (error) => errors.push(error),
      sseMaxRetryAttempts: 2,
      sseSleepFn: () => Promise.resolve(),
      url: '/jobs/1/events',
    });

    const events: unknown[] = [];
    for await (const event of stream) events.push(event);

    expect(events).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not go through grab', async () => {
    mockSse('data: {"ok":true}\n\n');

    const { stream } = await client.sse.get({ url: '/jobs/1/events' });
    for await (const _ of stream);

    expect(grab.log).toHaveLength(0);
  });

  it('applies a bearer token from the security scheme', async () => {
    mockSse('data: {"ok":true}\n\n');

    const authed = createClient(
      createConfig({ auth: () => 'secret', baseUrl: BASE, debug: false }),
    );

    const { stream } = await authed.sse.get({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/jobs/1/events',
    });
    for await (const _ of stream);

    const sentRequest = mockFetch.mock.calls[0]?.[0] as Request;
    expect(sentRequest.headers.get('Authorization')).toBe('Bearer secret');
  });

  it('runs request interceptors before connecting', async () => {
    mockSse('data: {"ok":true}\n\n');

    const scoped = createClient(createConfig({ baseUrl: BASE, debug: false }));
    scoped.interceptors.request.use((request) => {
      const next = new Request(request);
      next.headers.set('X-Trace', 'on');
      return next;
    });

    const { stream } = await scoped.sse.get({ url: '/jobs/1/events' });
    for await (const _ of stream);

    const sentRequest = mockFetch.mock.calls[0]?.[0] as Request;
    expect(sentRequest.headers.get('X-Trace')).toBe('on');
  });

  it('reports a non-ok response as an SSE error', async () => {
    mockFetch.mockResolvedValue(
      new Response(null, { status: 503, statusText: 'Service Unavailable' }),
    );

    const errors: unknown[] = [];
    const { stream } = await client.sse.get({
      onSseError: (error) => errors.push(error),
      sseMaxRetryAttempts: 1,
      sseSleepFn: () => Promise.resolve(),
      url: '/jobs/1/events',
    });

    const events: unknown[] = [];
    for await (const event of stream) events.push(event);

    expect(events).toEqual([]);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('SSE failed: 503 Service Unavailable');
  });
});

// ─── Codegen rewiring ─────────────────────────────────────────────────────────

describe('rewireGeneratedClient', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'api2client-'));
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
      'from "api2client"',
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
      `from 'api2client'`,
    );
    expect(readFileSync(join(dir, 'sdk.gen.ts'), 'utf8')).toContain(
      `from "api2client"`,
    );
  });

  it('fails loudly when the output directory is missing', () => {
    expect(() => rewireGeneratedClient(join(dir, 'nope'))).toThrow(/No generated output/);
  });
});
