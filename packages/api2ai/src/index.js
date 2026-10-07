/**
 * api2ai — generate an mcp-use MCP server from any OpenAPI specification.
 *
 *   spec/       load a spec, convert schemas to Zod, classify risk, extract tools
 *   templates/  one module per file of the generated server
 *   generate.js render + write the server
 *   cli.js      the `api2ai` command
 */

export { generateMcpServer, renderMcpServer } from './generate.js';
export { loadOpenApiSpec } from './spec/load-spec.js';
export { extractTools, resolveServerUrl } from './spec/extract-tools.js';
export { classifyRisk, toolAnnotations } from './spec/classify-risk.js';
export { schemaToZod, buildZodSchema, sanitizePropertyName } from './spec/schema-to-zod.js';
export { DEPENDENCY_VERSIONS, NODE_ENGINE } from './versions.js';
