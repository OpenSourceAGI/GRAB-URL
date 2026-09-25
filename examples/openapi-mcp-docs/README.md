# grab-url · One spec, three outputs

`openapi.json` is the only hand-written file here. Everything else is generated
from it:

| Command | Writes | What it is |
|---|---|---|
| `npm run codegen:client` | `src/client/` | A typed SDK (Hey API) whose transport is `grab` |
| `npm run codegen:mcp` | `mcp-server/` | An MCP server exposing each operation as a tool |
| — | the page itself | An API reference rendered from the spec by Scalar |

```bash
npm install
npm run dev
```

`src/client/` is checked in so the example boots without a codegen step.
`mcp-server/` is not — run `npm run codegen:mcp` to write it.

## The SDK

`src/main.ts` calls the generated functions and nothing else. Because their
transport is grab, each call takes grab options:

| Call | Shows |
|---|---|
| `listUsers` | Typed response, `cache` / `cacheForTime` per request |
| `listPosts` | A typed query parameter off the spec |
| `getUser` | A failed request returned as `{ error }` with the real status |
| `grab.mock["/users/1"]` | Stubbing one endpoint with no network and no code change |
| `grab.log` | Every SDK request in one shared log |

Configure the whole SDK once with `client.setConfig({ baseUrl, retryAttempts, timeout })`;
any request can still override it.

## The MCP server

```bash
npm run codegen:mcp              # api2ai ./openapi.json ./mcp-server
npm --prefix ./mcp-server install
npm run mcp:start                # http://localhost:3030/mcp
```

Every `operationId` becomes one tool, with the spec's parameter schemas turned
into Zod validation.

api2ai also scores each operation: writes, and anything whose name or path
mentions auth, payments, keys, deletion — or users, which is why every tool in
this spec lands above `low` — stay disabled behind an approval gate. That is
what `ALLOW_RESTRICTED_TOOLS=true REQUIRE_APPROVALS=false` in the `mcp:start`
script turns off for the demo; a real deployment reviews `mcp-server/.env` and
`src/tools-config.js` instead. The generated server also keeps a host allowlist
and a response-size cap around every call.

`src/mcp-agent.ts` is the client side — it connects with
[`mcp-use`](https://mcp-use.com), lists the tools and calls one:

```bash
npm run mcp:agent
```

The server also serves its own inspector at http://localhost:3030/inspector.

## The docs

The page renders the same `openapi.json` through
[Scalar](https://scalar.com)'s `createApiReference`, so the reference cannot
drift from the SDK or the MCP tools — there is only one spec to change.

Walkthrough: [OpenAPI SDKs](https://grab.js.org/docs/openapi-services).
