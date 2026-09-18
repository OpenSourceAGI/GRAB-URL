/**
 * One OpenAPI spec, three generated artifacts:
 *
 *   npm run codegen:client  →  src/client/   a typed SDK whose transport is grab
 *   npm run codegen:mcp     →  mcp-server/   an MCP server exposing each endpoint
 *   the page below          →  API reference rendered from the same spec
 *
 * Nothing here imports fetch or axios: the SDK sends through grab, so grab
 * options work per request and grab.mock can stub any endpoint.
 */
import { createApiReference } from "@scalar/api-reference";

// The slim entry, because that is the one api2client sends with. Importing
// "grab-url" here instead would load a second copy of the library with its own
// `mock` and `log`, and the stub below would never be consulted.
import { grab } from "grab-url/slim";

import spec from "../openapi.json";
import { client, getUser, listPosts, listUsers } from "./client";
import { describeMcpTools } from "./mcp-tools";

const output = document.querySelector<HTMLPreElement>("#output")!;
const toolsOut = document.querySelector<HTMLPreElement>("#tools")!;

function log(...args: unknown[]) {
  output.textContent += `\n${args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2)))
    .join(" ")}`;
}

// One place to configure the whole SDK. grab options set here apply to every
// endpoint; a request can still override them.
client.setConfig({
  baseUrl: spec.servers[0].url,
  retryAttempts: 2,
  timeout: 15,
});

async function run() {
  output.textContent = "listUsers — typed response, cached by grab";

  const first = performance.now();
  const { data: users } = await listUsers({ cache: true, cacheForTime: 60 });
  log(`took ${Math.round(performance.now() - first)}ms`);
  log("first 2 users:", users?.slice(0, 2));

  // Same path, same options: grab answers from its cache instead of the network.
  const second = performance.now();
  await listUsers({ cache: true, cacheForTime: 60 });
  log(`repeat call took ${Math.round(performance.now() - second)}ms (cached)`);

  output.textContent += "\n\nlistPosts — a typed query parameter";

  const { data: posts } = await listPosts({ query: { userId: 1 } });
  log(`user 1 wrote ${posts?.length ?? 0} posts; first:`, posts?.[0]?.title);

  output.textContent += "\n\ngetUser — an error comes back as data";

  const { data: missing, error, response } = await getUser({
    path: { id: 999999 },
  });
  if (error || !missing) log(`status ${response.status}:`, error ?? "not found");
  else log("user:", missing);

  output.textContent += "\n\ngetUser — stubbed with grab.mock, no network";

  // Mock keys are request paths relative to baseUrl, so any SDK endpoint can be
  // stubbed without a mock server or a change to the calling code.
  grab.mock["/users/1"] = {
    response: { id: 1, name: "Stubbed Person", email: "stub@example.com" },
  };

  const { data: stubbed } = await getUser({ path: { id: 1 } });
  log("mocked:", stubbed);

  delete grab.mock["/users/1"];

  output.textContent += "\n\ngrab.log — every SDK request in one place";
  log((grab.log ?? []).map((entry: { path: string }) => entry.path));
}

// The MCP server is generated from the same operations the SDK is, so the tool
// list can be derived from the spec without running the server.
toolsOut.textContent = describeMcpTools(spec);

// The same spec again, this time as browsable documentation.
createApiReference(document.getElementById("api-reference")!, {
  content: spec,
  hideClientButton: true,
});

run().catch((error) => log("Error:", error.message));
