/**
 * @file test/runtime/fixture.mjs
 * @description The HTTP fixture behind the runtime contract checks. Uses only
 * node:http, which Node, Bun and Deno all provide.
 */

import http from "node:http";

/**
 * Starts the fixture on a random local port. `fallback(req, res, url)` handles
 * any path the fixture does not — the browser runner serves its page there.
 */
export async function startFixture(fallback) {
  let flakyHits = 0;
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const url = new URL(req.url, "http://fixture");
    const json = (status, value) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(value));
    };
    switch (url.pathname) {
      case "/echo":
        return json(200, { method: req.method, query: url.search, body, trace: req.headers["x-trace"] ?? null });
      case "/text":
        res.writeHead(200, { "content-type": "text/plain" });
        return res.end("hello");
      case "/missing":
        return json(404, { message: "nope" });
      case "/slow":
        return void setTimeout(() => json(200, {}), 500);
      case "/flaky":
        // Fails every other hit, so each check that retries once succeeds.
        return ++flakyHits % 2 ? json(503, {}) : json(200, { hits: flakyHits });
    }
    if (fallback && (await fallback(req, res, url)) !== false) return;
    json(404, {});
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
