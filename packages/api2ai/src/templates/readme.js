import { NODE_ENGINE } from '../versions.js';

const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ');

/** `README.md` of the generated server. */
export function generateReadme(serverName, tools, specPath, baseUrl, port) {
  const toolList = tools
    .map(t => {
      const desc = t.description.split('\n')[0];
      return `| \`${t.name}\` | ${t.method.toUpperCase()} | ${cell(t.pathTemplate)} | ${t.riskLevel} | ${cell(desc.substring(0, 60))}${desc.length > 60 ? '…' : ''} |`;
    })
    .join('\n');

  return `# ${serverName}

MCP server generated from an OpenAPI specification by [api2ai](https://www.npmjs.com/package/api2ai), built on the [mcp-use](https://mcp-use.com) framework.

- 🛠️ **${tools.length} tools** — one per OpenAPI operation, with Zod-validated input
- 📡 **Streamable HTTP** at \`/mcp\`
- 🔍 **Inspector** at \`/mcp/inspector\` via \`npm run dev\`
- 🔐 **Auth** — bearer token or a custom header, never overridable by tool input
- 🛡️ **Risk policy** — mutating and sensitive tools are off until you opt in

## Quick start

Requires Node ${NODE_ENGINE}.

\`\`\`bash
npm install
cp .env.example .env   # then add your API credentials
npm start              # http://localhost:${port}/mcp
npm run dev            # hot reload + Inspector at http://localhost:${port}/mcp/inspector
\`\`\`

## Security

**Generation-time classification** — each tool is \`low\`, \`medium\` or \`high\` risk.
Read-only (\`GET\`/\`HEAD\`/\`OPTIONS\`) operations are \`low\` and enabled.
Mutating operations are \`medium\` and blocked unless \`ALLOW_RESTRICTED_TOOLS=true\`.
Anything matching admin, payment, auth, billing or credential patterns is \`high\`.

**Runtime policy** — \`checkToolPolicy()\` runs before every call and enforces the risk level and approval settings below.

**HTTP hardening** — request timeouts, a streamed response size cap, no redirects, a host allowlist (by default only the spec's API host), and credential headers that tool arguments cannot set.

> The Inspector exposes every registered tool. Don't run \`npm run dev\` or \`start:inspector\` on a public interface.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| \`PORT\` | Server port | ${port} |
| \`HOST\` | Bind address (\`0.0.0.0\` for containers) | 127.0.0.1 |
| \`API_BASE_URL\` | Base URL for API requests | ${baseUrl || '(none in spec)'} |
| \`API_KEY\` | Sent as \`Authorization: Bearer …\` | - |
| \`API_AUTH_HEADER\` | Custom auth header, \`Header-Name:value\` | - |
| \`ALLOWED_API_HOSTS\` | Comma-separated API hosts that may be called | the spec's host |
| \`ALLOW_RESTRICTED_TOOLS\` | Enable medium/high-risk tools | false |
| \`REQUIRE_APPROVALS\` | Refuse restricted tools until approved | true |
| \`REQUEST_TIMEOUT_MS\` | Upstream request timeout | 30000 |
| \`MAX_RESPONSE_BYTES\` | Upstream response size cap | 10485760 |
| \`MCP_URL\` | Public URL when behind a proxy (its host is allowed) | - |
| \`ALLOWED_ORIGINS\` | Browser origins allowed to call \`/mcp\` | - |

## Connect a client

**Claude Code**

\`\`\`bash
claude mcp add --transport http ${serverName} http://localhost:${port}/mcp
\`\`\`

**Claude Desktop, Cursor, and other JSON-configured clients**

\`\`\`json
{
  "mcpServers": {
    "${serverName}": { "url": "http://localhost:${port}/mcp" }
  }
}
\`\`\`

## Tools

| Tool | Method | Path | Risk | Description |
|------|--------|------|------|-------------|
${toolList}

## Project structure

\`\`\`
${serverName}/
├── .env / .env.example
├── package.json
└── src/
    ├── index.js         # MCPServer + one server.tool() per operation
    ├── http-client.js   # Outbound requests (timeouts, size cap, no redirects)
    ├── tools-config.js  # Method, path, parameters and risk for each tool
    └── policy.js        # Tool policy, host allowlist, header filtering
\`\`\`

## Deploy

\`\`\`dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production HOST=0.0.0.0
EXPOSE ${port}
CMD ["node", "src/index.js"]
\`\`\`

## Source

- **OpenAPI spec**: \`${specPath}\`
- **Generated**: ${new Date().toISOString()}

## License

MIT
`;
}
