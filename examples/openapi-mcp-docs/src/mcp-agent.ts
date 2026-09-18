/**
 * Connect to the generated MCP server with mcp-use — the client side of
 * `npm run codegen:mcp`.
 *
 *   npm run codegen:mcp     # writes ./mcp-server from openapi.json
 *   npm --prefix ./mcp-server install
 *   npm run mcp:start       # serves it on http://localhost:3030/mcp
 *   npm run mcp:agent       # this file: lists the tools, then calls one
 *
 * Run it with Node, not the browser — an MCP client speaks to a server process.
 */
import { MCPClient } from "mcp-use";

const SERVER_URL = process.env.MCP_URL ?? "http://localhost:3030/mcp";

const client = new MCPClient({
  mcpServers: {
    placeholder: { url: SERVER_URL },
  },
});

async function main() {
  const session = await client.createSession("placeholder");

  // Every operationId in openapi.json is here as a tool, with the spec's
  // parameter schemas already turned into Zod validation on the server.
  const tools = await session.connector.listTools();
  console.log(`${tools.length} tools from ${SERVER_URL}:`);
  for (const tool of tools) console.log(`  ${tool.name} — ${tool.description ?? ""}`);

  // Calling a tool runs the request the spec describes. The generated server
  // enforces its own host allowlist and response-size cap around it — and its
  // risk policy, which is why mcp:start sets ALLOW_RESTRICTED_TOOLS.
  const result = await session.connector.callTool("getUser", { id: 1 });
  const [first] = result.content as Array<{ type: string; text?: string }>;
  console.log("\ngetUser(1) →", first?.text ?? JSON.stringify(result.content));

  await client.closeAllSessions();
}

main().catch((error) => {
  console.error("Error:", error.message);
  console.error("Is the server running? npm run mcp:start");
  process.exit(1);
});
