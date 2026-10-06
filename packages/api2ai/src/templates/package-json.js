import { DEPENDENCY_VERSIONS, NODE_ENGINE } from '../versions.js';

export function generatePackageJson(serverName, tools) {
  return JSON.stringify({
    name: serverName,
    version: '1.0.0',
    description: `MCP server generated from OpenAPI spec (${tools.length} tools)`,
    type: 'module',
    main: 'src/index.js',
    scripts: {
      // Node's own .env loader (22.9+) replaces the dotenv dependency.
      start: 'node --env-file-if-exists=.env src/index.js',
      // `mcp-use dev` imports the default-exported server, hot-reloads it and
      // mounts the Inspector next to the MCP endpoint.
      dev: 'mcp-use dev --entry src/index.js',
      'start:inspector': 'mcp-use start --entry src/index.js --with-inspector',
    },
    dependencies: { ...DEPENDENCY_VERSIONS },
    engines: { node: NODE_ENGINE },
  }, null, 2) + '\n';
}
