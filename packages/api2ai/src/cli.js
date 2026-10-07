#!/usr/bin/env node

/**
 * api2ai CLI — generate an mcp-use MCP server from an OpenAPI spec.
 *
 *   npx api2ai <openapi-spec> [output-folder] [options]
 */

import { realpathSync } from 'fs';
import { fileURLToPath } from 'url';
import { generateMcpServer } from './generate.js';

const HELP = `
OpenAPI to MCP Server Generator (mcp-use framework)

Usage:
  npx api2ai <openapi-spec> [output-folder] [options]

Arguments:
  openapi-spec    Path or URL of an OpenAPI 3.x spec (JSON or YAML)
  output-folder   Directory to create the server in (default: ./mcp-server)

Options:
  --name <name>            Server name (default: api-mcp-server)
  --base-url <url>         Override API base URL from the spec
  --port <port>            Server port (default: 3000)
  --allow-mutations        Enable medium-risk POST/PUT/PATCH/DELETE tools by default
  --include-tags <tags>    Only include tools with these tags (comma-separated)
  --exclude-tags <tags>    Exclude tools with these tags (comma-separated)
  --exclude-ops <ids>      Exclude these operationIds (comma-separated)
  --approve-writes         Write REQUIRE_APPROVALS=false into the generated .env
  --help, -h               Show this help message

Examples:
  npx api2ai ./petstore.json ./my-server
  npx api2ai https://petstore3.swagger.io/api/v3/openapi.json ./petstore-mcp \\
    --name petstore-api --port 8080
`;

const list = (value) => value.split(',').map(s => s.trim()).filter(Boolean);

/** Parse argv (without node + script) into generateMcpServer options. */
export function parseArgs(args) {
  const options = {
    specPath: args[0],
    outputFolder: './mcp-server',
    baseUrl: undefined,
    serverName: 'api-mcp-server',
    port: 3000,
  };

  const takesValue = new Set(['--base-url', '--name', '--port', '--include-tags', '--exclude-tags', '--exclude-ops']);

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (takesValue.has(arg)) {
      const value = args[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      if (arg === '--base-url') options.baseUrl = value;
      else if (arg === '--name') options.serverName = value;
      else if (arg === '--port') {
        options.port = Number.parseInt(value, 10);
        if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
          throw new Error(`Invalid --port: ${value}`);
        }
      }
      else if (arg === '--include-tags') options.includeTags = list(value);
      else if (arg === '--exclude-tags') options.excludeTags = list(value);
      else if (arg === '--exclude-ops') options.excludeOperationIds = list(value);
    } else if (arg === '--allow-mutations') {
      options.allowMutations = true;
    } else if (arg === '--approve-writes') {
      options.requireApprovals = false;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg} (see --help)`);
    } else {
      options.outputFolder = arg;
    }
  }

  return options;
}

export async function main(args = process.argv.slice(2)) {
  if (args.length < 1 || args.includes('--help') || args.includes('-h')) {
    console.log(HELP);
    return;
  }
  const options = parseArgs(args);
  await generateMcpServer(options.specPath, options.outputFolder, options);
}

// realpathSync follows the npm/npx bin symlink so this still matches when
// invoked as `npx api2ai` (argv[1] is the symlink in node_modules/.bin).
export const isMainModule = (metaUrl) =>
  Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(metaUrl);

if (isMainModule(import.meta.url)) {
  main().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  });
}
