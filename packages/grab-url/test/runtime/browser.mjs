/**
 * @file test/runtime/browser.mjs
 * @description Runs the runtime contract (checks.mjs) inside real Chromium,
 * Firefox and WebKit via Playwright, against the BUILT default entry loaded as
 * a native ES module — the way a no-bundler page would load it.
 *
 *   npm run build
 *   node test/runtime/browser.mjs [chromium firefox webkit]
 *
 * Playwright is not a dependency of this repo: install it wherever you like
 * and point PLAYWRIGHT_MODULE at it, or have it resolvable as `playwright`.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { startFixture } from "./fixture.mjs";
import { report } from "./checks.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const dist = fileURLToPath(new URL("../../dist/", import.meta.url));
const playwright = await import(
  process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright"
);

const page = `<!doctype html><meta charset="utf-8"><title>grab contract</title>
<script type="module">
  import { grab, GrabError } from "/dist/grab-api-slim.es.js";
  import { runChecks } from "/runtime/checks.mjs";
  window.__results = runChecks({ grab, GrabError, base: "", unreachable: "http://127.0.0.1:1/" });
</script>`;

const { server, origin } = await startFixture(async (_req, res, url) => {
  const send = (type, body) => { res.writeHead(200, { "content-type": type }); res.end(body); };
  if (url.pathname === "/") return send("text/html", page);
  // Only plain names, so a crafted path cannot read outside the two folders.
  const file = url.pathname.match(/^\/(dist|runtime)\/([\w.-]+\.m?js)$/);
  if (!file) return false;
  try {
    send("text/javascript", await readFile((file[1] === "dist" ? dist : here) + file[2]));
  } catch {
    return false;
  }
});

const names = process.argv.slice(2).length ? process.argv.slice(2) : ["chromium", "firefox", "webkit"];
let failed = 0;
for (const name of names) {
  const browser = await playwright[name].launch();
  try {
    const tab = await browser.newPage();
    const errors = [];
    tab.on("pageerror", (e) => errors.push(e.message));
    await tab.goto(origin + "/");
    await tab.waitForFunction(() => window.__results, null, { timeout: 15_000 });
    const results = await tab.evaluate(() => window.__results);
    for (const message of errors) results.push({ name: "no uncaught page errors", ok: false, error: message });
    failed += report(`${name} ${browser.version()}`, results);
  } finally {
    await browser.close();
  }
}
server.close();
process.exit(failed ? 1 : 0);
