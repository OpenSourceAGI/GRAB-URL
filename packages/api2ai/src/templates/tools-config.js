/** `src/tools-config.js` of the generated server: per-tool routing + policy data. */
export function generateToolsConfig(tools) {
  const toolConfigs = tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    method: tool.method,
    pathTemplate: tool.pathTemplate,
    executionParameters: tool.executionParameters,
    requestBodyContentType: tool.requestBodyContentType,
    baseUrl: tool.baseUrl,
    tags: tool.tags,
    operationId: tool.operationId,
    riskLevel: tool.riskLevel,
    requiresApproval: tool.requiresApproval,
    allowedInInspector: tool.allowedInInspector,
    enabledByDefault: tool.enabledByDefault,
  }));

  return `// Tool configurations extracted from the OpenAPI spec

export const toolConfigs = ${JSON.stringify(toolConfigs, null, 2)};

export const toolConfigMap = new Map(toolConfigs.map(t => [t.name, t]));
`;
}
