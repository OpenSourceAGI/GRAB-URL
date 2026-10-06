/**
 * Dependency versions written into every generated server's package.json.
 *
 * The generated code targets the mcp-use 2.x API (`import { MCPServer } from
 * 'mcp-use'`, `inputSchema`, async `listen()`); a caret on the major keeps
 * `npm install` from pulling a 3.x that the templates were not written for.
 * Bump these together with the templates in ./templates/.
 */
export const DEPENDENCY_VERSIONS = {
  'mcp-use': '^2.7.3',
  // mcp-use validates tool input through Standard Schema; zod 4 implements it.
  zod: '^4.6.5',
};

/** mcp-use 2.x declares `engines.node >= 22.22.2`. */
export const NODE_ENGINE = '>=22.22.2';
