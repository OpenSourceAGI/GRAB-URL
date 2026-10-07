import { classifyRisk, toolAnnotations } from './classify-risk.js';
import { buildZodSchema, deref, mergeParameters } from './schema-to-zod.js';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * The API base URL from `servers[0]`, with `{variables}` replaced by their
 * defaults and a relative URL ("/api/v3") resolved against the spec's own URL.
 */
export function resolveServerUrl(spec, specUrl) {
  const server = spec.servers?.[0];
  if (!server?.url) return undefined;
  let url = server.url.replace(/\{([^}]+)\}/g, (match, name) => server.variables?.[name]?.default ?? match);
  if (!/^https?:\/\//i.test(url)) {
    if (!specUrl || !/^https?:\/\//i.test(specUrl)) return undefined;
    url = new URL(url, specUrl).toString();
  }
  return url.replace(/\/+$/, '');
}

const toToolName = (operationId) =>
  operationId.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 64) || 'tool';

/**
 * Turn every operation in the spec into a tool description.
 *
 * @param {object} spec parsed OpenAPI document
 * @param {object} [options]
 * @param {string} [options.baseUrl] override `servers[0].url`
 * @param {string} [options.specUrl] where the spec came from, for relative server URLs
 * @param {string[]} [options.excludeOperationIds]
 * @param {string[]} [options.includeTags] keep only operations carrying one of these tags
 * @param {string[]} [options.excludeTags] drop operations carrying any of these tags
 * @param {boolean} [options.allowMutations] enable medium-risk tools by default
 * @param {(tool: object) => boolean} [options.filterFn]
 */
export function extractTools(spec, options = {}) {
  const {
    excludeOperationIds = [],
    filterFn,
    allowMutations = false,
    includeTags = [],
    excludeTags = [],
  } = options;
  const baseUrl = options.baseUrl || resolveServerUrl(spec, options.specUrl);

  const tools = [];
  const usedNames = new Set();

  for (const [pathTemplate, pathItem] of Object.entries(spec.paths || {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;

      const operationId = operation.operationId || `${method}_${pathTemplate.replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (excludeOperationIds.includes(operationId)) continue;

      const risk = classifyRisk(operation, method, pathTemplate);
      if (allowMutations && risk.isMutation && risk.riskLevel === 'medium') {
        risk.enabledByDefault = true;
        risk.requiresApproval = false;
      }

      if (includeTags.length > 0 && !risk.tags.some(t => includeTags.includes(t))) continue;
      if (excludeTags.length > 0 && risk.tags.some(t => excludeTags.includes(t))) continue;

      // Two operationIds can sanitize to the same name; MCP requires unique names.
      let name = toToolName(operationId);
      for (let n = 2; usedNames.has(name); n++) name = `${toToolName(operationId).slice(0, 60)}_${n}`;

      const description = (operation.summary && operation.description && operation.description !== operation.summary
        ? `${operation.summary}\n\n${operation.description}`
        : operation.summary || operation.description || `${method.toUpperCase()} ${pathTemplate}`
      ).substring(0, 1024);

      const parameters = mergeParameters(pathItem.parameters, operation.parameters, spec)
        .filter(p => p.in !== 'cookie');
      const requestBody = deref(operation.requestBody, spec);

      const tool = {
        name,
        title: operation.summary || name,
        description,
        zodSchema: buildZodSchema(operation, pathItem.parameters, spec),
        annotations: toolAnnotations(method, operation.summary || name),
        method,
        pathTemplate,
        executionParameters: parameters.map(p => ({ name: p.name, in: p.in })),
        // Must match the media type buildZodSchema took the body schema from.
        requestBodyContentType: requestBody?.content
          ? ('application/json' in requestBody.content ? 'application/json' : Object.keys(requestBody.content)[0])
          : undefined,
        operationId,
        baseUrl,
        tags: risk.tags,
        isMutation: risk.isMutation,
        riskLevel: risk.riskLevel,
        requiresApproval: risk.requiresApproval,
        allowedInInspector: risk.allowedInInspector,
        enabledByDefault: risk.enabledByDefault,
      };

      if (filterFn && !filterFn(tool)) continue;
      usedNames.add(name);
      tools.push(tool);
    }
  }

  return tools;
}
