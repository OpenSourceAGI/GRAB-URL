# @grab-url/grab-api

Core implementation of `grab()` — the single-function request manager that ships in [`grab-url`](https://grab.js.org). One function, no runtime dependencies, minimalist syntax. This is the workspace package; most users should consume the published `grab-url` package instead.

```bash
npm i grab-url
```

```ts
import grab, { log } from "grab-url";

const res = await grab("search", { query: "search words", post: true });
log(res);
```

## What's in this package

| Folder         | Purpose                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- |
| [common/](common/)     | Shared `GrabOptions` / `GrabFunction` / `GrabLogEntry` types and small utilities         |
| [core/](core/)         | The main `grab()` implementation, request executor, flow control, cache, regrab events   |
| [response/](response/) | Response parsing, JSON conversion, and infinite-scroll pagination handling               |
| [devtools/](devtools/) | `Ctrl+Alt+I` in-browser overlay showing requests, responses, timing, and JSON structure  |
| [index.ts](index.ts)   | Public entry point — wires up globals (`window.grab`, `window.log`) and exports the API  |

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
import grab from "grab-url";

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
bun run build   # vite build, uses repo's vite.config.ts
```

## Links

- 📑 Docs: <https://grab.js.org>
- 🎯 Examples: <https://grab.js.org/docs/examples>
- 💬 Discord: <https://discord.gg/SJdBqBz3tV>
