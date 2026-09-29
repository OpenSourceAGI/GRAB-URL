/**
 * @file contract.test.ts
 * @description The golden-behavior contract for grab(), pinned against a real
 * HTTP server rather than a stubbed fetch — so it exercises the runtime's own
 * fetch, headers, redirects, aborts and body streams.
 *
 * Every assertion here is a promise documented in RUNTIME_SUPPORT.md. If one
 * fails, the change is breaking: update RUNTIME_SUPPORT.md, the CHANGELOG and
 * the major version together, or put the old behavior back. The "known quirks"
 * block pins behavior that is arguably wrong but shipped — fixing a quirk is
 * still a contract change and has to be done deliberately, not incidentally.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { grab, GrabError, isGrabError } from '../../grab-api/src/index.slim.ts';
import { fetchFailure } from '../../grab-api/src/common/grab-error.ts';
import type { GrabContext, GrabPlugin } from '../../grab-api/src/index.slim.ts';

// ─── fixture server ──────────────────────────────────────────────────────────

type Seen = { method: string; url: string; headers: http.IncomingHttpHeaders; body: string };
const seen: Seen[] = [];
const hits = new Map<string, number>();
let base = '';
let server: http.Server;

function hit(path: string) {
  const n = (hits.get(path) ?? 0) + 1;
  hits.set(path, n);
  return n;
}

beforeAll(async () => {
  server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const url = new URL(req.url!, 'http://fixture');
    seen.push({ method: req.method!, url: req.url!, headers: req.headers, body });
    const json = (status: number, value: unknown, headers: Record<string, string> = {}) => {
      res.writeHead(status, { 'content-type': 'application/json', ...headers });
      res.end(JSON.stringify(value));
    };
    const n = hit(url.pathname);

    switch (url.pathname) {
      case '/echo':
        return json(200, { method: req.method, query: url.search, body, contentType: req.headers['content-type'] ?? null });
      case '/text':
        res.writeHead(200, { 'content-type': 'text/plain' });
        return res.end('hello');
      case '/entities':
        res.writeHead(200, { 'content-type': 'text/plain' });
        return res.end('Tom &amp; Jerry');
      case '/binary':
        res.writeHead(200, { 'content-type': 'application/octet-stream' });
        return res.end(Buffer.from([1, 2, 3, 4]));
      case '/no-content-type-json':
        return res.end('{"ok":true}');
      case '/no-content-type-text':
        return res.end('plain words');
      case '/bad-json':
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end('{bad');
      case '/not-found-json':
        return json(404, { message: 'no such user' });
      case '/server-error-text':
        res.writeHead(500, { 'content-type': 'text/plain' });
        return res.end('exploded');
      case '/teapot-binary':
        res.writeHead(418, { 'content-type': 'application/octet-stream' });
        return res.end(Buffer.from([9, 9]));
      case '/redirect':
        res.writeHead(302, { location: '/echo?from=redirect' });
        return res.end();
      case '/slow':
        setTimeout(() => json(200, { slow: true }), 400);
        return;
      case '/flaky':
        // Fails twice, then succeeds.
        return n <= 2 ? json(503, { n }, { 'retry-after': '5' }) : json(200, { n });
      case '/half-body':
        // Promise 100 bytes, send 5, then drop the connection.
        res.writeHead(200, { 'content-type': 'application/json', 'content-length': '100' });
        res.write('{"a":');
        setTimeout(() => res.destroy(), 20);
        return;
      case '/count':
        setTimeout(() => json(200, { n }), 50);
        return;
      default:
        return json(404, {});
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  seen.length = 0;
  hits.clear();
  grab.log = [];
  grab.mock = {};
  grab.defaults = {};
});

/** grab() against the fixture, with logging off so failures stay readable. */
function g(path: string, options: Record<string, any> = {}) {
  return grab(path, { baseURL: base, debug: false, ...options }) as Promise<any>;
}

/** Runs a request and returns the GrabError its onError received. */
async function failure(path: string, options: Record<string, any> = {}) {
  let caught: GrabError | undefined;
  const result = await g(path, { ...options, onError: (_m: string, _u: string, _p: unknown, e: GrabError) => { caught = e; } });
  return { result, error: caught! };
}

// ─── response bodies ─────────────────────────────────────────────────────────

describe('contract: response bodies', () => {
  it('spreads a JSON object onto the response and keeps it under .data', async () => {
    const r = await g('/echo');
    expect(r.method).toBe('GET');
    expect(r.data).toEqual({ method: 'GET', query: '', body: '', contentType: 'application/json' });
    expect(r.error).toBeUndefined();
    expect(r.isLoading).toBeUndefined();
  });

  it('puts text under .data', async () => {
    const r = await g('/text');
    expect(r.data).toBe('hello');
  });

  it('unescapes HTML entities in text by default, and not when unescapeHTML is false', async () => {
    expect((await g('/entities')).data).toBe('Tom & Jerry');
    expect((await g('/entities', { unescapeHTML: false })).data).toBe('Tom &amp; Jerry');
  });

  it('returns application/octet-stream as a Blob under .data', async () => {
    const r = await g('/binary');
    expect(r.data).toBeInstanceOf(Blob);
    expect(new Uint8Array(await r.data.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('parses a response with no content-type as JSON', async () => {
    const r = await g('/no-content-type-json');
    expect(r.ok).toBe(true);
  });

  it('follows redirects and returns the final body', async () => {
    const r = await g('/redirect');
    expect(r.query).toBe('?from=redirect');
    expect(seen.map((s) => s.url)).toEqual(['/redirect', '/echo?from=redirect']);
  });
});

// ─── request encoding ────────────────────────────────────────────────────────

describe('contract: request encoding', () => {
  it('sends GET params as a query string', async () => {
    const r = await g('/echo', { q: 'cats', page: 2 });
    expect(r.query).toBe('?q=cats&page=2');
    expect(r.body).toBe('');
  });

  it('sends POST/PUT/PATCH params as a JSON body', async () => {
    for (const [flag, method] of [['post', 'POST'], ['put', 'PUT'], ['patch', 'PATCH']] as const) {
      const r = await g('/echo', { [flag]: true, a: 1 });
      expect(r.method).toBe(method);
      expect(JSON.parse(r.body)).toEqual({ a: 1 });
      expect(r.query).toBe('');
    }
  });

  it('sends DELETE params as a query string', async () => {
    const r = await g('/echo', { method: 'DELETE', id: 7 });
    expect(r.method).toBe('DELETE');
    expect(r.query).toBe('?id=7');
  });

  it('sends an explicit body verbatim, and body:null sends none', async () => {
    expect((await g('/echo', { post: true, body: 'raw' })).body).toBe('raw');
    expect((await g('/echo', { post: true, body: null, a: 1 })).body).toBe('');
  });

  it('merges caller headers over the JSON defaults', async () => {
    await g('/echo', { headers: { Authorization: 'Bearer t', Accept: 'text/plain' } });
    expect(seen[0].headers.authorization).toBe('Bearer t');
    expect(seen[0].headers.accept).toBe('text/plain');
    expect(seen[0].headers['content-type']).toBe('application/json');
  });

  it('never sends utility options as params', async () => {
    const plugin: GrabPlugin = { name: 'noop' };
    const r = await g('/echo', { cache: false, cacheForTime: 5, retryAttempts: 0, timeout: 5, rateLimit: 0, plugins: [plugin] });
    expect(r.query).toBe('');
  });
});

// ─── failures ────────────────────────────────────────────────────────────────

describe('contract: failures resolve, never reject', () => {
  it('reports non-2xx as "HTTP error: <status> <statusText>" with code HTTP', async () => {
    const { result, error } = await failure('/not-found-json');
    expect(result.error).toBe('HTTP error: 404 Not Found');
    expect(error).toBeInstanceOf(GrabError);
    expect(error.code).toBe('HTTP');
    expect(error.status).toBe(404);
    expect(error.retryable).toBe(false);
    expect(error.method).toBe('GET');
    expect(error.url).toBe(`${base}/not-found-json`);
  });

  it('leaves the error body unread on GrabError.response for JSON, text and binary', async () => {
    const json = await failure('/not-found-json');
    expect(await json.error.response!.json()).toEqual({ message: 'no such user' });

    const text = await failure('/server-error-text');
    expect(text.result.error).toBe('HTTP error: 500 Internal Server Error');
    expect(text.error.retryable).toBe(true);
    expect(await text.error.response!.text()).toBe('exploded');

    const bin = await failure('/teapot-binary');
    expect(bin.error.status).toBe(418);
    expect(new Uint8Array(await bin.error.response!.arrayBuffer())).toEqual(new Uint8Array([9, 9]));
  });

  it('reports an unparseable body as PARSE, keeping the parser message', async () => {
    const { result, error } = await failure('/bad-json');
    expect(result.error).toMatch(/^Error parsing response: SyntaxError: /);
    expect(error.code).toBe('PARSE');
    expect(error.status).toBe(200);
  });

  it('reports a body that dies half-way as STREAM', async () => {
    const { result, error } = await failure('/half-body');
    expect(result.error).toMatch(/^Error parsing response: /);
    expect(error.code).toBe('STREAM');
    expect(error.retryable).toBe(true);
  });

  it('reports an unreachable host as NETWORK', async () => {
    let error: GrabError | undefined;
    const r: any = await grab('http://127.0.0.1:1/nothing', { debug: false, onError: (...a: any[]) => { error = a[3]; } });
    expect(typeof r.error).toBe('string');
    expect(error!.code).toBe('NETWORK');
    expect(error!.retryable).toBe(true);
    expect(error!.cause).toBeDefined();
  });

  it('reports the timeout option elapsing as TIMEOUT', async () => {
    const { result, error } = await failure('/slow', { timeout: 0.05 });
    expect(result.error).toBe('The operation was aborted due to timeout');
    expect(error.code).toBe('TIMEOUT');
  });

  it('classifies a timeout as TIMEOUT even when fetch rejects with a plain AbortError (WebKit)', () => {
    const timedOut = { aborted: true, reason: new DOMException('timed out', 'TimeoutError') } as unknown as AbortSignal;
    const cancelled = { aborted: true, reason: new DOMException('aborted', 'AbortError') } as unknown as AbortSignal;
    const webkit = new DOMException('Fetch is aborted', 'AbortError');
    expect(fetchFailure(webkit, timedOut).code).toBe('TIMEOUT');
    expect(fetchFailure(webkit, cancelled).code).toBe('ABORTED');
    expect(fetchFailure(webkit).code).toBe('ABORTED');
    expect(fetchFailure(new TypeError('Load failed')).code).toBe('NETWORK');
  });

  it('reports a request cancelled by cancelOngoingIfNew as ABORTED', async () => {
    let first: GrabError | undefined;
    const pending = g('/slow', { cancelOngoingIfNew: true, onError: (...a: any[]) => { first = a[3]; } });
    await new Promise((r) => setTimeout(r, 30));
    const second = await g('/slow', { cancelOngoingIfNew: true });
    const aborted = await pending;
    expect(second.slow).toBe(true);
    expect(typeof aborted.error).toBe('string');
    expect(first!.code).toBe('ABORTED');
  });

  it('reports rateLimit refusals as RATE_LIMITED', async () => {
    await g('/echo', { rateLimit: 10 });
    const { result, error } = await failure('/echo', { rateLimit: 10 });
    expect(result.error).toBe('Fetch rate limit exceeded for /echo. Wait 10s between requests.');
    expect(error.code).toBe('RATE_LIMITED');
  });

  it('passes the message, URL, params and GrabError to onError, in that order', async () => {
    const calls: any[][] = [];
    await g('/not-found-json', { q: 1, onError: (...a: any[]) => calls.push(a) });
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('HTTP error: 404 Not Found');
    expect(calls[0][1]).toBe(`${base}/not-found-json`);
    expect(calls[0][2]).toEqual({ q: 1 });
    expect(isGrabError(calls[0][3])).toBe(true);
  });

  it('sets .error on a caller-supplied response object and clears isLoading', async () => {
    const state: any = {};
    await g('/not-found-json', { response: state });
    expect(state.error).toBe('HTTP error: 404 Not Found');
    expect(state.isLoading).toBeUndefined();
  });
});

// ─── retries, concurrency, cache ─────────────────────────────────────────────

describe('contract: retries, concurrency and cache', () => {
  it('retries retryAttempts times, sharing one trace id across numbered attempts', async () => {
    const attempts: Array<[string, number]> = [];
    const r = await g('/flaky', {
      retryAttempts: 2,
      plugins: [{ name: 'spy', finally: (ctx: GrabContext) => { attempts.push([ctx.id, ctx.attempt]); } }],
    });
    expect(r.n).toBe(3);
    expect(hits.get('/flaky')).toBe(3);
    // Inner attempts settle first: the recursion unwinds outward.
    expect(attempts.map(([, n]) => n).sort()).toEqual([1, 2, 3]);
    expect(new Set(attempts.map(([id]) => id)).size).toBe(1);
  });

  it('retries immediately — Retry-After is not honored', async () => {
    const started = Date.now();
    await g('/flaky', { retryAttempts: 2 });
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it('returns the last error when retries run out', async () => {
    const r = await g('/flaky', { retryAttempts: 1 });
    expect(r.error).toBe('HTTP error: 503 Service Unavailable');
    expect(hits.get('/flaky')).toBe(2);
  });

  it('sends concurrent identical requests separately — no automatic dedupe', async () => {
    const [a, b] = await Promise.all([g('/count'), g('/count')]);
    expect(hits.get('/count')).toBe(2);
    expect([a.n, b.n].sort()).toEqual([1, 2]);
  });

  it('drops a second concurrent request under cancelNewIfOngoing', async () => {
    const first = g('/slow', { cancelNewIfOngoing: true });
    await new Promise((r) => setTimeout(r, 30));
    const second = await g('/slow', { cancelNewIfOngoing: true });
    expect(second).toEqual({ isLoading: true });
    expect((await first).slow).toBe(true);
    expect(hits.get('/slow')).toBe(1);
  });

  it('cache:true pre-fills the prior response, still refetches, and reports it', async () => {
    const statuses: unknown[] = [];
    const plugins = [{ name: 'spy', finally: (ctx: GrabContext) => { statuses.push(ctx.meta.cacheStatus); } }];
    await g('/count', { cache: true, plugins });
    const state: any = {};
    const pending = g('/count', { cache: true, plugins, response: state });
    await new Promise((r) => setTimeout(r, 0));
    expect(state.n).toBe(1); // the cached value shows before the refetch lands
    expect((await pending).n).toBe(2);
    await g('/count', { plugins });
    expect(statuses).toEqual(['miss', 'revalidated', 'bypass']);
  });
});

// ─── plugin lifecycle ────────────────────────────────────────────────────────

describe('contract: plugin lifecycle', () => {
  it('runs stages in order and exposes request, response and meta', async () => {
    const order: string[] = [];
    let last: GrabContext | undefined;
    const record = (stage: string) => (ctx: GrabContext) => { order.push(stage); last = ctx; };
    await g('/echo', {
      plugins: [{
        name: 'order',
        beforeRequest: record('beforeRequest'),
        afterResponse: record('afterResponse'),
        beforeParse: record('beforeParse'),
        afterParse: record('afterParse'),
        onError: record('onError'),
        finally: record('finally'),
      }],
    });
    expect(order).toEqual(['beforeRequest', 'afterResponse', 'beforeParse', 'afterParse', 'finally']);
    expect(last!.url).toBe(`${base}/echo`);
    expect(last!.method).toBe('GET');
    expect(last!.response!.status).toBe(200);
    expect(last!.meta.status).toBe(200);
    expect(last!.meta.transport).toBe('fetch');
    expect(last!.meta.fromCache).toBe(false);
    expect(last!.meta.deduped).toBe(false);
    expect(last!.meta.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('runs onError then finally on failure, with the GrabError on the context', async () => {
    const order: string[] = [];
    let code: string | undefined;
    await g('/not-found-json', {
      plugins: [{
        name: 'order',
        afterParse: () => { order.push('afterParse'); },
        onError: (ctx: GrabContext) => { order.push('onError'); code = ctx.error!.code; },
        finally: () => { order.push('finally'); },
      }],
    });
    expect(order).toEqual(['onError', 'finally']);
    expect(code).toBe('HTTP');
  });

  it('sends headers a beforeRequest hook adds', async () => {
    await g('/echo', {
      plugins: [{ name: 'auth', beforeRequest: (ctx: GrabContext) => { ctx.init.headers['x-trace'] = ctx.id; } }],
    });
    expect(seen[0].headers['x-trace']).toMatch(/\S/);
  });

  it('returns the data an afterParse hook substitutes', async () => {
    const r = await g('/echo', {
      plugins: [{ name: 'map', afterParse: (ctx: GrabContext) => { ctx.data = { mapped: true }; } }],
    });
    expect(r.mapped).toBe(true);
    expect(r.method).toBeUndefined();
  });

  it('fails the request as PLUGIN when a shaping hook throws', async () => {
    const { result, error } = await failure('/echo', {
      plugins: [{ name: 'strict', afterParse: () => { throw new Error('bad shape'); } }],
    });
    expect(result.error).toBe('Plugin "strict" failed in afterParse: bad shape');
    expect(error.code).toBe('PLUGIN');
    expect(error.response!.status).toBe(200);
  });

  it('keeps a GrabError a hook throws, so a validator can set its own code', async () => {
    const { error } = await failure('/echo', {
      plugins: [{
        name: 'schema',
        afterParse: () => { throw new GrabError('invalid user', { code: 'VALIDATION', issues: ['name'] }); },
      }],
    });
    expect(error.code).toBe('VALIDATION');
    expect(error.issues).toEqual(['name']);
  });

  it('swallows throws from onError and finally', async () => {
    const r = await g('/echo', { plugins: [{ name: 'noisy', finally: () => { throw new Error('ignored'); } }] });
    expect(r.error).toBeUndefined();
    const f = await g('/not-found-json', { plugins: [{ name: 'noisy', onError: () => { throw new Error('ignored'); } }] });
    expect(f.error).toBe('HTTP error: 404 Not Found');
  });

  it('applies plugins set on defaults and on an instance', async () => {
    const stages: string[] = [];
    const api = grab.instance({ baseURL: base, debug: false, plugins: [{ name: 'i', beforeRequest: () => { stages.push('instance'); } }] });
    await api('/echo');
    grab.defaults = { plugins: [{ name: 'd', beforeRequest: () => { stages.push('defaults'); } }] };
    await g('/echo');
    expect(stages).toEqual(['instance', 'defaults']);
  });

  it('reports transport "mock" and skips response hooks for mocked paths', async () => {
    grab.mock['mocked'] = { response: { fake: true } };
    const stages: string[] = [];
    let transport: string | undefined;
    const r = await g('/mocked', {
      plugins: [{
        name: 'spy',
        afterResponse: () => { stages.push('afterResponse'); },
        afterParse: (ctx: GrabContext) => { stages.push('afterParse'); transport = ctx.meta.transport; },
      }],
    });
    expect(r.fake).toBe(true);
    expect(stages).toEqual(['afterParse']);
    expect(transport).toBe('mock');
  });

  it('records meta on the request log entry', async () => {
    await g('/echo');
    expect(grab.log[0].meta).toMatchObject({ attempt: 1, status: 200, transport: 'fetch', cacheStatus: 'bypass' });
  });

  it('advertises the feature flags integrations check', () => {
    expect(grab.supports).toMatchObject({ onRawResponse: true, plugins: true, grabError: true });
  });
});

// ─── streams ─────────────────────────────────────────────────────────────────

describe('contract: onStream', () => {
  it('hands the raw ReadableStream to onStream and resolves with data null', async () => {
    let text = '';
    const r = await g('/text', {
      onStream: async (body: ReadableStream<Uint8Array>) => { text = await new Response(body).text(); },
    });
    expect(text).toBe('hello');
    expect(r.data).toBeNull();
  });

  it('reports an onStream consumer that throws as STREAM', async () => {
    const { result, error } = await failure('/text', { onStream: () => { throw new Error('consumer broke'); } });
    expect(result.error).toBe('consumer broke');
    expect(error.code).toBe('STREAM');
  });
});

// ─── known quirks — shipped behavior; changing any of these is breaking ──────

describe('contract: known quirks', () => {
  it('sends Content-Type: application/json even with a FormData body', async () => {
    const form = new FormData();
    form.append('a', '1');
    const r = await g('/echo', { post: true, body: form });
    expect(r.contentType).toBe('application/json');
    expect(r.body).toContain('name="a"');
  });

  it('sends Content-Type: application/json even with a URLSearchParams body', async () => {
    const r = await g('/echo', { post: true, body: new URLSearchParams({ a: '1' }) });
    expect(r.contentType).toBe('application/json');
    expect(r.body).toBe('a=1');
  });

  it('lets a beforeRequest plugin drop that header so fetch sets the multipart boundary', async () => {
    const form = new FormData();
    form.append('a', '1');
    const r = await g('/echo', {
      post: true,
      body: form,
      plugins: [{ name: 'form', beforeRequest: (ctx: GrabContext) => { delete ctx.init.headers['Content-Type']; } }],
    });
    expect(r.contentType).toMatch(/^multipart\/form-data; boundary=/);
  });

  it('keys the cache on path and params only — not headers — so callers share entries', async () => {
    await g('/echo', { cache: true, headers: { Authorization: 'alice' } });
    const bob: any = {};
    const pending = g('/echo', { cache: true, headers: { Authorization: 'bob' }, response: bob });
    await new Promise((r) => setTimeout(r, 0));
    expect(bob.method).toBe('GET'); // pre-filled from alice's entry before bob's own request lands
    await pending;
    expect(seen.map((s) => s.headers.authorization)).toEqual(['alice', 'bob']);
  });

  it('adds a grab.log entry for every request, repeats included, and never trims it', async () => {
    for (let i = 0; i < 5; i++) await g('/echo', { i });
    await g('/echo', { i: 0 });
    expect(grab.log).toHaveLength(6);
  });

  it('serializes array params comma-joined and object params as [object Object]', async () => {
    const r = await g('/echo', { ids: [1, 2], filter: { x: 1 } });
    expect(r.query).toBe('?ids=1%2C2&filter=%5Bobject+Object%5D');
  });

  it('fails a text body with no content-type, because it is parsed as JSON', async () => {
    const { error } = await failure('/no-content-type-text');
    expect(error.code).toBe('PARSE');
  });
});
