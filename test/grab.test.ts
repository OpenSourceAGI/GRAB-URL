/**
 * @file grab.test.ts
 * @description Unit tests for the grab() API function and utilities.
 * Runs in Node (Vitest) — no window globals assumed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { grab, log } from '../packages/grab-api/src/index.js';

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockOk(body: unknown) {
  const isJson = typeof body !== 'string';
  const text = isJson ? JSON.stringify(body) : body as string;
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: {
      get: (name: string) => isJson ? 'application/json' : 'text/plain',
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(text),
  });
}

function mockErr(msg: string) {
  mockFetch.mockRejectedValueOnce(new Error(msg));
}

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

// ─── Basic HTTP ───────────────────────────────────────────────────────────────

describe('grab() — Basic HTTP', () => {
  it('makes a GET request and returns parsed JSON', async () => {
    mockOk({ id: 1, name: 'Alice' });
    const result = await grab('users/1');
    expect(result.id).toBe(1);
    expect(result.name).toBe('Alice');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('appends query params to the URL', async () => {
    mockOk({ results: [] });
    await grab('search', { q: 'hello', page: 2 });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('q=hello');
    expect(url).toContain('page=2');
  });

  it('sends POST when post:true is set', async () => {
    mockOk({ created: true });
    await grab('users', { post: true, name: 'Bob', email: 'bob@example.com' });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.name).toBe('Bob');
    expect(body.email).toBe('bob@example.com');
    // Internal flags must not leak into the body
    expect(body.post).toBeUndefined();
  });

  it('respects a custom baseURL', async () => {
    mockOk({ ok: true });
    await grab('health', { baseURL: 'https://api.example.com/v2/' });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('api.example.com/v2/health');
  });

  it('returns error info on network failure', async () => {
    mockErr('Network error');
    const result = await grab('failing');
    expect(result.error).toBe('Network error');
  });

  it('returns raw text for non-JSON responses', async () => {
    mockOk('plain text');
    const result = await grab('text');
    expect(result.data).toBe('plain text');
  });
});

// ─── Response object mutation ─────────────────────────────────────────────────

describe('grab() — Response object', () => {
  it('merges response data into a provided response object', async () => {
    mockOk({ userId: 42, role: 'admin' });
    const state: any = {};
    await grab('profile', { response: state });
    expect(state.userId).toBe(42);
    expect(state.role).toBe('admin');
  });

  it('sets isLoading=true while in flight, undefined after', async () => {
    let resolve: (v: any) => void;
    mockFetch.mockReturnValueOnce(
      new Promise(r => { resolve = r; }).then(v => ({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(v),
        text: () => Promise.resolve(JSON.stringify(v)),
      }))
    );
    const state: any = {};
    const promise = grab('slow', { response: state });
    expect(state.isLoading).toBe(true);
    resolve!({ data: 'done' });
    await promise;
    expect(state.isLoading).toBeUndefined();
  });

  it('sets error on state object when fetch fails', async () => {
    mockErr('Timeout');
    const state: any = {};
    await grab('bad', { response: state });
    expect(state.error).toBe('Timeout');
    expect(state.isLoading).toBeUndefined();
  });
});

// ─── Mock server ─────────────────────────────────────────────────────────────

describe('grab() — Mock server', () => {
  it('uses a static mock response without hitting fetch', async () => {
    grab.mock['products'] = { response: [{ id: 1 }, { id: 2 }] };
    const result = await grab('products');
    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('uses a function mock that receives request params', async () => {
    grab.mock['search'] = {
      response: (params: any) => ({ hits: [`result for ${params.q}`] }),
    };
    const result = await grab('search', { post: true, q: 'vitest' });
    expect(result.hits).toEqual(['result for vitest']);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('simulates error via mock throw', async () => {
    grab.mock['broken'] = {
      response: () => { throw new Error('Mock error'); },
    };
    const result = await grab('broken');
    expect(result.error).toBe('Mock error');
  });
});

// ─── Caching ─────────────────────────────────────────────────────────────────

describe('grab() — Client-side cache', () => {
  it('preserves cached data across repeated cacheable requests', async () => {
    mockOk({ cached: true });
    mockOk({ cached: true });
    const r1 = await grab('cats', { cache: true });
    const r2 = await grab('cats', { cache: true });
    expect(r1.cached).toBe(true);
    expect(r2.cached).toBe(true);
  });
});

// ─── instance() ───────────────────────────────────────────────────────────────

describe('grab.instance()', () => {
  it('creates an isolated instance with its own defaults', async () => {
    mockOk({ ok: true });
    const api = grab.instance({ baseURL: 'https://partner.io/api/' });
    await api('status');
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('partner.io/api/status');
  });

  it('allows per-call overrides on top of instance defaults', async () => {
    mockOk({});
    const api = grab.instance({ baseURL: 'https://base.io/' });
    await api('items', { baseURL: 'https://override.io/' });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('override.io/items');
  });
});

// ─── TypeScript generics (type-level, runtime smoke) ──────────────────────────

describe('grab() — TypeScript generics', () => {
  it('typed response compiles and returns the right shape', async () => {
    type User = { name: string; age: number };
    mockOk({ name: 'Carol', age: 28 });
    const user = await grab<User>('users/me');
    expect(user.name).toBe('Carol');
    expect(typeof user.age).toBe('number');
  });
});