<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://grab.js.org"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/GRAB-URL/tree/master/packages/api2client"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/api2client"><img src="https://img.shields.io/npm/dm/api2client.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/api2client"><img src="https://img.shields.io/npm/v/api2client.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/api2client"><img src="https://img.shields.io/npm/dt/api2client.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/api2client"><img src="https://img.shields.io/npm/types/api2client" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=api2client"><img src="https://packagephobia.com/badge?p=api2client" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/GRAB-URL" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/GRAB-URL?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/GRAB-URL?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/GRAB-URL?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/GRAB-URL" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/GRAB-URL.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" alt="npm" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" />
</p>
<!-- template-git-repo:badges:end -->

# api2client

Generate a fully typed SDK from an OpenAPI spec with [Hey API](https://heyapi.dev), then let [grab](https://grab.js.org) send the requests instead of axios or fetch.

The generated code is unchanged — the same `getPet()`, `createPet()` functions, the same types. Only the transport underneath is swapped, so every endpoint in the SDK gains caching, retries, rate limiting, request deduplication, a mock server and the shared request log.

```ts
import { getPet } from "./client";

const { data, error, response } = await getPet({
  path: { petId: "42" },
  cache: true,        // grab options work per request
  retryAttempts: 2,
});
```

## Install

```bash
npm i api2client
npm i -D @hey-api/openapi-ts
```

## Generate

```bash
npx api2client https://petstore3.swagger.io/api/v3/openapi.json ./src/client
```

That runs `@hey-api/openapi-ts` and rewires the output to this client. Options:

| Option                   | Purpose                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `-i, --input <path\|url>` | OpenAPI spec to generate from                              |
| `-o, --output <dir>`     | Where to write the SDK — default `./src/client`            |
| `-c, --client <name>`    | Hey API client to generate against — default `@hey-api/client-fetch` |
| `--rewire-only`          | Skip generation, rewire an SDK you already generated       |
| `--no-rewire`            | Generate without swapping in the grab client               |

Anything else is forwarded to the `openapi-ts` CLI. The same thing from Node:

```ts
import { generateFromOpenAPI } from "api2client";

await generateFromOpenAPI({ input: "./openapi.yaml", output: "./src/client" });
```

Already generating with your own `openapi-ts.config.ts`? Keep it, and rewire afterwards:

```jsonc
// package.json
"scripts": {
  "codegen": "openapi-ts && api2client --rewire-only ./src/client"
}
```

## Configure

The generated `client.gen.ts` exports a `client` you can configure once for the whole SDK:

```ts
import { client } from "./client/client.gen";

client.setConfig({
  baseUrl: "https://api.example.com",
  auth: () => localStorage.getItem("token"),

  // grab options, applied to every request in the SDK
  cache: true,
  cacheForTime: 60,
  retryAttempts: 2,
  rateLimit: 1,
  timeout: 15,
});
```

Or build a client yourself:

```ts
import { createClient, createConfig } from "api2client";

const client = createClient(createConfig({ baseUrl: "https://api.example.com" }));
```

### grab options

Every option below is accepted client-wide in `createConfig()`/`setConfig()` and per request. See [grab options](https://grab.js.org/docs/grab-options) for the full reference.

| Option                                 | Effect                                             |
| -------------------------------------- | -------------------------------------------------- |
| `cache`, `cacheForTime`                | Serve repeated requests from grab's frontend cache  |
| `retryAttempts`                        | Retry failed requests                               |
| `rateLimit`                            | Minimum seconds between requests to the same path   |
| `timeout`                              | Seconds before the request is aborted               |
| `cancelOngoingIfNew`, `cancelNewIfOngoing` | Deduplicate concurrent requests to the same path |
| `debug`, `logger`                      | Log requests and responses                          |
| `unzip`, `parseDOM`, `unescapeHTML`    | Opt back into grab's ZIP/HTML post-processing       |
| `grab`                                 | Use a custom grab instance, e.g. `grab.instance({})` |

### Mock any endpoint

`grab.mock` keys are request paths (with or without a leading slash), so an SDK endpoint can be stubbed without touching the network:

```ts
import { grab } from "grab-url";

grab.mock["/pets/42"] = { response: { id: "42", name: "Rex" } };

const { data } = await getPet({ path: { petId: "42" } }); // { id: "42", name: "Rex" }
```

## What you get back

The standard Hey API result — `{ data, error, request, response }`, or just `data` with `responseStyle: "data"`, or a thrown error with `throwOnError: true`:

```ts
const { data, error, response } = await getPet({ path: { petId: "99" } });

if (error) console.log(response.status, error); // 404 { message: "Pet not found" }
```

`buildUrl()`, `interceptors.request/response/error`, `security`/`auth`, `bodySerializer`, `querySerializer`, `parseAs`, `responseValidator` and `responseTransformer` all behave as they do in the official clients.

## Server-sent events

An operation whose response is `text/event-stream` generates an SDK function that calls `client.sse.<method>()` instead of `client.<method>()`, and returns `{ stream }` — an async generator of parsed event data:

```ts
import { streamJobEvents } from "./client";

const { stream } = await streamJobEvents({ path: { jobId: "42" } });

for await (const event of stream) console.log(event); // parsed `data:` payload
```

SSE is a long-lived connection, not a single request/response, so it connects with `fetch` directly instead of going through grab — grab's cache/retry/rate-limit model is built around a request that completes, not one that stays open and reconnects on its own. Pass these alongside the usual request options:

| Option                    | Effect                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| `onSseEvent`               | Called for every event, with its `data`, `event`, `id` and `retry`  |
| `onSseError`               | Called when a connection attempt fails, before it retries           |
| `sseDefaultRetryDelay`     | default=3000 Delay before the first retry, in ms                    |
| `sseMaxRetryAttempts`      | Give up after this many retry attempts                              |
| `sseMaxRetryDelay`         | default=30000 Cap on the exponential backoff delay, in ms           |
| `fetch`                    | Fetch implementation to use — default=`globalThis.fetch`            |

Reconnects honor the server's `retry:` field and send `Last-Event-ID` from the last event's `id:`, matching browser `EventSource` semantics. A stream that ends normally (the server closes the connection) does not reconnect — only a network or parse error does.

## Differences from `@hey-api/client-fetch`

- **Transport failures are returned, not thrown.** A timeout or connection failure comes back as `{ error }` (or throws when `throwOnError` is set), matching grab's "errors are data" behavior. HTTP error statuses behave the same as in the official clients.
- **Bodies are parsed by grab.** `parseAs: "stream"` hands you the raw stream, and an explicit `parseAs` still decides the empty-response shape, but otherwise grab's content-type detection reads the body.
- **grab sets JSON `Content-Type`/`Accept` defaults** on requests that do not specify their own, including body-less ones.
- **Response interceptors run before parsing**, on a response whose body grab has already read.
- **`sse` endpoints bypass grab** and connect with `fetch` directly — see [Server-sent events](#server-sent-events).

## Requirements

Needs `grab-url` ≥ 1.6.23 for the `onRawResponse` hook, which is what reports the response status, headers and parsed error payloads. The client detects support and never sends options an older grab would turn into query parameters, so it still runs on 1.6.22 — but there a failed request comes back as grab's error message (`"HTTP error: 404 Not Found"`) with **no `response` at all**, so `result.response.status` throws. Anything that branches on the status needs 1.6.23.

## What's in this package

| Path                                                     | Purpose                                              |
| -------------------------------------------------------- | ---------------------------------------------------- |
| [src/client.ts](src/client.ts)                           | `createClient()` — the Hey API interface over grab    |
| [src/types.ts](src/types.ts)                             | The client contract generated SDKs type-check against |
| [src/utils.ts](src/utils.ts)                             | Config merging, URL building, auth, interceptors      |
| [src/core/](src/core)                                    | OpenAPI path/query/body serializers, SSE streaming     |
| [src/generate.ts](src/generate.ts)                       | Codegen and rewiring of generated output              |
| [src/cli.ts](src/cli.ts)                                 | The `api2client` command                             |

Serialization and SSE streaming in `src/core/` are ported from Hey API's client core (MIT) so generated SDKs produce identical URLs, bodies and event streams on any client.
