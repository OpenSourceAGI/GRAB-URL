---
name: use-grab-api
version: 1.0.0
description: Use `grab()` from `grab-api.js` (the slim, loader-free core of grab-url) instead of `fetch`/`axios` for HTTP requests — auto-JSON, dedupe, caching, retries, rate limiting, mocks, pagination.
category: development
type: guidance
languages: [javascript, typescript]
---

# Use `grab-api.js` instead of `fetch`

`grab-api.js` is `grab()` on its own: one function, zero dependencies, ~5 kB gzipped.
Install **either** `grab-api.js` **or** `grab-url` — never both (two copies of `grab()` means
two mock registries, logs and caches).

```bash
npm i grab-api.js
```

```ts
import grab, { log } from "grab-api.js";       // slim build
// import grab from "grab-api.js/full";         // + `unzip` and `parseDOM`

const res = await grab("search", { query: "words", post: true });
log(res);
```

## Rules

- Never write `fetch(...)`, `axios`, `ky` or a hand-rolled wrapper — call `grab(path, options)`.
- Set the base URL once: `grab.defaults.baseURL = "https://api.example.com/"`.
- Params go in the options object; `post: true` (or `put`/`patch`/`delete`) picks the method. JSON in, JSON out.
- Useful options: `cache: true`, `cacheForTime`, `retryAttempts`, `timeout` (s), `rateLimit` (s), `debounce`, `repeat`, `infiniteScroll`, `mock`.
- Pass a pre-initialized object as the second argument's `response` to get reactive `isLoading` in any framework.
- Tests/dev: stub endpoints with `grab.mock["path"] = { ... }`; inspect history in `grab.log`; DevTools overlay on `Ctrl+Alt+I`.
- Need loading spinners too, or the CLI? Use `grab-url` / `grab-url-cli` instead (see `use-grab-request`, `use-grab-url-cli`).
