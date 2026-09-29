/**
 * @file test/runtime/smoke.mjs
 * @description Runs the runtime contract (checks.mjs) against the BUILT
 * default entry under whichever server runtime launches it — no test
 * framework, no install:
 *
 *   node test/runtime/smoke.mjs            # Node 18+
 *   bun test/runtime/smoke.mjs
 *   deno run -A test/runtime/smoke.mjs
 *
 * Run `npm run build` first. GRAB_ENTRY=<path> tests another bundle, e.g.
 * grab-api.js's dist or the /full entry.
 */

import { pathToFileURL } from "node:url";
import { startFixture } from "./fixture.mjs";
import { runChecks, report } from "./checks.mjs";

const entry = process.env.GRAB_ENTRY
  ? pathToFileURL(process.env.GRAB_ENTRY).href
  : new URL("../../dist/grab-api-slim.es.js", import.meta.url).href;
const { grab, GrabError } = await import(entry);

const runtime = globalThis.Deno ? `deno ${Deno.version.deno}`
  : globalThis.Bun ? `bun ${Bun.version}`
    : `node ${process.versions.node}`;

const { server, origin } = await startFixture();
const results = await runChecks({ grab, GrabError, base: origin, unreachable: "http://127.0.0.1:1/" });
server.close();
// Deno and Bun otherwise keep the process alive on the closed server's sockets.
process.exit(report(runtime, results) ? 1 : 0);
