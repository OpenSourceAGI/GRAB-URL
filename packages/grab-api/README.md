<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://grab.js.org"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/GRAB-URL/tree/master/packages/grab-api"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/GRAB-URL" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/GRAB-URL?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/GRAB-URL?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/GRAB-URL?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/GRAB-URL" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/GRAB-URL.svg" alt="GitHub last commit" /></a>
    <br />
    <a href="https://www.npmjs.com/package/grab-api.js"><img src="https://img.shields.io/npm/v/grab-api.js.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/grab-api.js"><img src="https://img.shields.io/npm/dm/grab-api.js.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://bundlephobia.com/package/grab-api.js"><img src="https://img.shields.io/bundlephobia/minzip/grab-api.js" alt="Bundle size" /></a>
    <img src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" alt="npm" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>
<!-- template-git-repo:badges:end -->

# grab-api.js

**Generate Request to API from Browser** — the core `grab()` request manager. One function,
no runtime dependencies, minimalist syntax, with auto-JSON, dedupe, caching, retries,
rate-limiting, mock testing, pagination and a DevTools overlay.

```bash
npm i grab-api.js
```

```ts
import grab, { log } from "grab-api.js";

const res = await grab("search", { query: "search words", post: true });
log(res);
```

## grab-api.js or grab-url?

Same code, same API, same version line — they differ only in what rides along:

| | [`grab-api.js`](https://www.npmjs.com/package/grab-api.js) | [`grab-url`](https://www.npmjs.com/package/grab-url) |
| --- | --- | --- |
| `grab()`, `log()`, DevTools | ✅ | ✅ |
| Loading animations, quantum sphere | — | ✅ |
| Subpaths | `.` · `/full` · `/slim` | `.` · `/full` · `/slim` · `/animations` · `/icons/quantum-sphere` · `/log` |

Pick `grab-api.js` when you want the request layer and nothing else. Switching is one line:

```ts
import grab from "grab-url";     // library + icons
import grab from "grab-api.js";  // request manager only
```

## Slim by default

`import grab from "grab-api.js"` gives you the **slim** build: ~5 kB gzipped, zero
dependencies, nothing lazily reachable that you did not ask for. That is every feature
below except the two that need a heavy library — ZIP extraction and HTML/DOM parsing.

```ts
import grab from "grab-api.js";        // default — ~5 kB gzipped
import grab from "grab-api.js/full";   // + `unzip` and `parseDOM`
```

`grab-api.js/full` adds linkedom (~174 kB) and the archive extractor, both behind lazy
imports, so they download only when a response actually needs one of them.
`grab-api.js/slim` still resolves, as an alias of the default — it is the identical
module, so a stub on `grab.mock` registered through either specifier is visible to the
other.

Both ESM and CommonJS work:

```js
const grab = require("grab-api.js");         // CJS
import grab from "grab-api.js";              // ESM
```

## What's in this package

| Folder         | Purpose                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- |
| [common/](https://github.com/OpenSourceAGI/GRAB-URL/tree/master/packages/grab-api/src/common)     | Shared `GrabOptions` / `GrabFunction` / `GrabLogEntry` types and small utilities         |
| [core/](https://github.com/OpenSourceAGI/GRAB-URL/tree/master/packages/grab-api/src/core)         | The main `grab()` implementation, request executor, flow control, cache, regrab events   |
| [response/](https://github.com/OpenSourceAGI/GRAB-URL/tree/master/packages/grab-api/src/response) | Response parsing, JSON conversion, and infinite-scroll pagination handling               |
| [devtools/](https://github.com/OpenSourceAGI/GRAB-URL/tree/master/packages/grab-api/src/devtools) | `Ctrl+Alt+I` in-browser overlay showing requests, responses, timing, and JSON structure  |
| [index.ts](https://github.com/OpenSourceAGI/GRAB-URL/blob/master/packages/grab-api/src/index.ts)   | Public entry point — wires up globals (`window.grab`, `window.log`) and exports the API  |

## Features (full list)

1. **One function, no dependencies** — minimalist syntax, [more features than alternatives](https://grab.js.org/docs/Comparisons).
2. **Auto-JSON convert** — pass params and get a JSON response or error; other content types pass through as-is.
3. **isLoading status** — sets `.isLoading = true` on the pre-initialized response object so any framework can render a loading state.
4. **Mock server** — configure `window.grab.mock` for development and tests.
5. **Cancel duplicates** — block (or cancel) an in-flight request to the same path & params.
6. **Timeout & retry** — customizable per request (default 30s), auto-retry on error.
7. **DevTools overlay** — `Ctrl+Alt+I` shows every request and response with timing and JSON structure.
8. **Request history** — every call is recorded in the global `grab.log` array.
9. **Pagination / infinite scroll** — auto-load and merge the next page, with scroll position recovery.
10. **Per-environment base URL** — set `grab.defaults.baseURL` once; override via `SERVER_API_URL` in `.env`.
11. **Frontend cache** — cache responses in memory for repeat requests to static data.
12. **Regrab triggers** — re-fetch on timeout, window refocus, network change, or staleness.
13. **Framework-agnostic** — unlike TanStack et al., `grab()` works outside React component init.
14. **Globals** — adds `grab`, `log`, `grab.log`, `grab.mock`, `grab.defaults` to `window` / `globalThis`.
15. **Debug logging** — `log()` prints colored JSON structure, response, and timing.
16. **Rate limiting** — require a minimum delay between requests to prevent cascading multi-click responses.
17. **Repeat / polling** — repeat N times or every X seconds.
18. **Auto-unzip** — automatically extracts ZIP responses using archiver-web. Set `unzip: false` to disable.
19. **DOM parsing** — automatically parses HTML responses using linkedom. Pass `dom: "selector"` for CSS selector extraction or `dom: false` to disable.

## Usage

```ts
import grab from "grab-api.js";

let res = $state({}) as {
  results: Array<{ title: string }>;
  isLoading: boolean;
  error: string;
};

await grab("search", { response: res, query: "search words", post: true });
grab("user").then(log);

// Mock testing server (response is an object or a function)
window.grab.mock["search"] = {
  response: (params) => ({ results: [{ title: `Result about ${params.query}` }] }),
  method: "POST",
};

// Set defaults for all requests
grab("", {
  setDefaults: true,
  baseURL: "http://localhost:8080",
  timeout: 30,
  debug: true,
  rateLimit: 1,
  cache: true,
  cancelOngoingIfNew: true,
});
```

## Instance with defaults

```ts
const api = grab.instance({ baseURL: "https://api.example.com", timeout: 10 });
const user = await api("user/me");
```

## Globals

In the browser:

- `window.grab` — the function
- `window.log` — the colored logger
- `grab.log` — request/response history
- `grab.mock` — mock route map
- `grab.defaults` — default `GrabOptions`

In Node.js / Bun the same names are attached to `globalThis`.

## Build

```bash
npm run build   # vite build, uses this package's vite.config.ts
```

## License

PROSPER-1.0.0 — see [LICENSE.md](LICENSE.md) and <https://rights.institute/prosper>.

## Links

- 📑 Docs: <https://grab.js.org>
- 🎯 Examples: <https://grab.js.org/docs/examples>
- 💬 Discord: <https://discord.gg/SJdBqBz3tV>
