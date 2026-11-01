---
name: use-api2client
version: 1.0.0
description: Generate a fully typed SDK from an OpenAPI spec with `api2client` (Hey API codegen with grab as transport) instead of hand-writing API calls; keep it regenerated from the spec.
category: development
type: guidance
languages: [typescript]
---

# Use `api2client` for spec-backed APIs

When an API has an OpenAPI/Swagger spec (including the project's own backend), generate the client — don't hand-write `fetch` calls or types.

```bash
npm i api2client
npm i -D @hey-api/openapi-ts
npx api2client <spec path|url> ./src/client      # generate + rewire to grab
```

Options: `-i/--input`, `-o/--output` (default `./src/client`), `-c/--client`, `--rewire-only`, `--no-rewire`.
With your own `openapi-ts.config.ts`: `"codegen": "openapi-ts && api2client --rewire-only ./src/client"` and run it on `prebuild`/`postinstall` so the SDK never drifts.

```ts
import { client } from "./client/client.gen";
import { getPet } from "./client";

client.setConfig({ baseUrl: "https://api.example.com", cache: true, retryAttempts: 2 });
const { data, error } = await getPet({ path: { petId: "42" }, cache: true });
```

Every grab option (`cache`, `retryAttempts`, `rateLimit`, `timeout`, mocks…) works globally or per request. Don't edit generated files — change the spec and regenerate.
