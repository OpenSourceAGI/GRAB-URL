---
name: use-api2ai
version: 1.0.0
description: Generate a production-ready MCP server (mcp-use framework) from any OpenAPI spec with `api2ai`, so agents can call an API as tools.
category: development
type: guidance
languages: [javascript, typescript]
---

# Use `api2ai` to expose an API to agents

Don't hand-write an MCP server for an API that has an OpenAPI spec — generate it.

```bash
npx api2ai <openapi-spec path|url> [output-folder] [options]
cd <output-folder> && npm install && npm start   # http://localhost:3000/mcp
npm run dev                                       # hot reload + Inspector at /mcp/inspector
```

Options: `--name`, `--base-url`, `--port`, `--allow-mutations` (enable POST/PUT/PATCH/DELETE tools), `--include-tags`, `--exclude-tags`, `--exclude-ops`, `--approve-writes`.

- Generated servers need Node 22.22.2+; the generator runs on Node 18+.
- Mutating tools are off/approval-gated by default (risk classification + policy). Only pass `--allow-mutations`/`--approve-writes` when the user asks.
- Scope tools down with `--include-tags` / `--exclude-ops` for least privilege.
- Auth (bearer, API key, custom headers) is configured via the generated `.env`. Never commit it.
