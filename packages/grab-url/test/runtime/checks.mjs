/**
 * @file test/runtime/checks.mjs
 * @description The runtime contract, as plain async checks with no imports —
 * so the identical list runs in Node, Bun and Deno (smoke.mjs) and inside real
 * browsers (browser.mjs). Each check is a promise RUNTIME_SUPPORT.md makes;
 * the full suite is test/contract.test.ts.
 *
 * @param {object} env
 * @param {Function} env.grab       the grab() under test
 * @param {Function} env.GrabError  its error class
 * @param {string}   env.base       fixture origin ("" when same-origin)
 * @param {string}   env.unreachable a URL nothing listens on
 * @returns {Promise<{ name: string, ok: boolean, error?: string }[]>}
 */
export async function runChecks({ grab, GrabError, base, unreachable }) {
  const results = [];
  const check = async (name, fn) => {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, error: String(e?.message ?? e) });
    }
  };
  const equal = (actual, expected, label = "") => {
    const a = JSON.stringify(actual), b = JSON.stringify(expected);
    if (a !== b) throw new Error(`${label} expected ${b}, got ${a}`);
  };
  const g = (path, options = {}) => grab(path, { baseURL: base, debug: false, ...options });
  const failing = async (path, options = {}) => {
    let error;
    const result = await g(path, { ...options, onError: (_m, _u, _p, e) => { error = e; } });
    return { result, error };
  };

  await check("GET JSON with query params", async () => {
    const r = await g("/echo", { q: "x", n: 2 });
    equal([r.method, r.query, r.data.method], ["GET", "?q=x&n=2", "GET"]);
  });

  await check("POST params become a JSON body", async () => {
    const r = await g("/echo", { post: true, a: 1 });
    equal([r.method, JSON.parse(r.body)], ["POST", { a: 1 }]);
  });

  await check("text lands under .data", async () => {
    equal((await g("/text")).data, "hello");
  });

  await check("non-2xx resolves with the error string and an HTTP GrabError", async () => {
    const { result, error } = await failing("/missing");
    equal(result.error, "HTTP error: 404 Not Found");
    equal([error instanceof GrabError, error.code, error.status, error.retryable], [true, "HTTP", 404, false]);
    equal(await error.response.json(), { message: "nope" }, "unread error body:");
  });

  await check("timeout resolves with a TIMEOUT GrabError", async () => {
    const { result, error } = await failing("/slow", { timeout: 0.05 });
    equal([typeof result.error, error.code], ["string", "TIMEOUT"]);
  });

  await check("unreachable host resolves with a NETWORK GrabError", async () => {
    let error;
    const r = await grab(unreachable, { debug: false, onError: (...a) => { error = a[3]; } });
    equal([typeof r.error, error.code], ["string", "NETWORK"]);
  });

  await check("retryAttempts retries and numbers the attempts", async () => {
    const attempts = [];
    const r = await g("/flaky", { retryAttempts: 1, plugins: [{ name: "spy", finally: (c) => attempts.push(c.attempt) }] });
    equal([typeof r.hits, attempts.sort()], ["number", [1, 2]]);
  });

  await check("plugins run in order and can set headers", async () => {
    const order = [];
    const stage = (s) => (ctx) => { order.push(s); if (s === "beforeRequest") ctx.init.headers["x-trace"] = ctx.id; };
    const r = await g("/echo", {
      plugins: [{ name: "o", beforeRequest: stage("beforeRequest"), afterResponse: stage("afterResponse"), beforeParse: stage("beforeParse"), afterParse: stage("afterParse"), finally: stage("finally") }],
    });
    equal(order, ["beforeRequest", "afterResponse", "beforeParse", "afterParse", "finally"]);
    if (!r.trace) throw new Error("x-trace header did not reach the server");
  });

  await check("onStream receives a ReadableStream body", async () => {
    let text = "";
    const r = await g("/text", { onStream: async (body) => { text = await new Response(body).text(); } });
    equal([text, r.data], ["hello", null]);
  });

  await check("grab.mock answers without the network", async () => {
    grab.mock["mocked"] = { response: { fake: true } };
    try {
      equal((await g("/mocked")).fake, true);
    } finally {
      grab.mock = {};
    }
  });

  await check("feature flags", async () => {
    equal([grab.supports.onRawResponse, grab.supports.plugins, grab.supports.grabError], [true, true, true]);
  });

  return results;
}

/** Prints results and returns how many failed. */
export function report(label, results) {
  console.log(`grab() runtime contract — ${label}`);
  for (const r of results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.name}${r.ok ? "" : `\n       ${r.error}`}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed} failed on ${label}\n` : `\nall passed on ${label}\n`);
  return failed;
}
