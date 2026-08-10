# heyapi-client-grab

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
npm i heyapi-client-grab
npm i -D @hey-api/openapi-ts
```

## Generate

```bash
npx heyapi-grab https://petstore3.swagger.io/api/v3/openapi.json ./src/client
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
import { generateFromOpenAPI } from "heyapi-client-grab";

await generateFromOpenAPI({ input: "./openapi.yaml", output: "./src/client" });
```

Already generating with your own `openapi-ts.config.ts`? Keep it, and rewire afterwards:

```jsonc
// package.json
"scripts": {
  "codegen": "openapi-ts && heyapi-grab --rewire-only ./src/client"
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
import { createClient, createConfig } from "heyapi-client-grab";

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

`grab.mock` keys are request paths, so an SDK endpoint can be stubbed without touching the network:

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

## Differences from `@hey-api/client-fetch`

- **Transport failures are returned, not thrown.** A timeout or connection failure comes back as `{ error }` (or throws when `throwOnError` is set), matching grab's "errors are data" behavior. HTTP error statuses behave the same as in the official clients.
- **Bodies are parsed by grab.** `parseAs: "stream"` hands you the raw stream, and an explicit `parseAs` still decides the empty-response shape, but otherwise grab's content-type detection reads the body.
- **grab sets JSON `Content-Type`/`Accept` defaults** on requests that do not specify their own, including body-less ones.
- **Response interceptors run before parsing**, on a response whose body grab has already read.
- **No `sse` helpers.** Server-sent event endpoints need the fetch client.

## Requirements

`grab-url` ≥ 1.6.23, which added the `onRawResponse` hook this client uses to report status codes, headers and error payloads.

## What's in this package

| Path                                                     | Purpose                                              |
| -------------------------------------------------------- | ---------------------------------------------------- |
| [src/client.ts](src/client.ts)                           | `createClient()` — the Hey API interface over grab    |
| [src/types.ts](src/types.ts)                             | The client contract generated SDKs type-check against |
| [src/utils.ts](src/utils.ts)                             | Config merging, URL building, auth, interceptors      |
| [src/core/](src/core)                                    | OpenAPI path/query/body serializers                   |
| [src/generate.ts](src/generate.ts)                       | Codegen and rewiring of generated output              |
| [src/cli.ts](src/cli.ts)                                 | The `heyapi-grab` command                             |

Serialization in `src/core/` is ported from Hey API's client core (MIT) so generated SDKs produce identical URLs and bodies on any client.
