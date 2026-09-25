/**
 * Every call below is a generated Hey API SDK function from ./src/client.
 * Nothing here imports fetch or axios — the SDK's transport is grab, so grab
 * options can be passed per request and grab.mock can stub any endpoint.
 */
// The same package api2client sends with. Importing "grab-url" here instead
// would load a second copy of grab with its own `mock` and `log`, and the stub
// below would never be consulted.
import { grab } from "grab-api.js";

import { client } from "./client/client.gen";
import { addPet, findPetsByStatus, getPetById } from "./client/sdk.gen";

const output = document.querySelector<HTMLPreElement>("#output")!;

function log(...args: unknown[]) {
  output.textContent += `\n${args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2)))
    .join(" ")}`;
}

// One place to configure the whole SDK. grab options set here apply to every
// endpoint; a request can still override them.
client.setConfig({
  baseUrl: "https://petstore3.swagger.io/api/v3",
  retryAttempts: 2,
  timeout: 15,
});

async function run() {
  output.textContent = "1. findPetsByStatus — typed response, cached by grab";

  const first = performance.now();
  const { data: available } = await findPetsByStatus({
    query: { status: "available" },
    cache: true,
    cacheForTime: 60,
  });
  log(`took ${Math.round(performance.now() - first)}ms`);
  log("first 2 pets:", available?.slice(0, 2));

  // Same path, same options: grab answers from its cache instead of the network.
  const second = performance.now();
  await findPetsByStatus({ query: { status: "available" }, cache: true });
  log(`repeat call took ${Math.round(performance.now() - second)}ms (cached)`);

  output.textContent += "\n\n2. getPetById — errors come back as data";

  const { data: pet, error, response } = await getPetById({
    path: { petId: 999999999 },
  });
  if (error) log(`status ${response.status}:`, error);
  else log("pet:", pet);

  output.textContent += "\n\n3. addPet — stubbed with grab.mock, no network";

  // Mock keys are request paths relative to baseUrl, so any SDK endpoint can
  // be stubbed without a mock server or a change to the calling code.
  grab.mock["/pet"] = {
    method: "POST",
    response: { id: 42, name: "Rex", status: "available", photoUrls: [] },
  };

  const { data: created } = await addPet({
    body: { name: "Rex", photoUrls: [], status: "available" },
  });
  log("created:", created);

  delete grab.mock["/pet"];

  output.textContent += "\n\n4. grab.log — every SDK request in one place";
  log((grab.log ?? []).map((entry) => entry.path));
}

run().catch((error) => log("Error:", error.message));
