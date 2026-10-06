const READ_ONLY_METHODS = ['get', 'head', 'options'];

// Matched against operationId, summary, description, path and tags. Broad on
// purpose: a false "high" only costs an env flag, a false "low" exposes a
// destructive endpoint to an agent with no approval step.
const DANGEROUS_PATTERNS = [
  'delete', 'remove', 'destroy', 'purge',
  'payment', 'payout', 'billing', 'invoice',
  'admin', 'role', 'permission', 'token', 'secret', 'key',
  'webhook', 'auth', 'oauth', 'user', 'member',
];

/**
 * Classify an operation as low / medium / high risk.
 *
 * low    — read-only method and no dangerous keyword: enabled, no approval
 * medium — mutating method: disabled unless ALLOW_RESTRICTED_TOOLS=true
 * high   — any dangerous keyword, whatever the method
 */
export function classifyRisk(operation, method, pathTemplate) {
  const tags = operation.tags || [];
  const haystack = [operation.operationId, operation.summary, operation.description, pathTemplate, ...tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const isMutation = !READ_ONLY_METHODS.includes(method);
  const matchedDanger = DANGEROUS_PATTERNS.some(p => haystack.includes(p));
  const riskLevel = matchedDanger ? 'high' : isMutation ? 'medium' : 'low';

  return {
    tags,
    isMutation,
    riskLevel,
    requiresApproval: riskLevel !== 'low',
    allowedInInspector: riskLevel === 'low',
    enabledByDefault: riskLevel === 'low',
  };
}

/**
 * MCP tool annotations (hints a client may show or act on). They describe
 * the HTTP semantics, independent of the risk policy above.
 */
export function toolAnnotations(method, title) {
  return {
    title,
    readOnlyHint: READ_ONLY_METHODS.includes(method),
    destructiveHint: method === 'delete',
    idempotentHint: ['get', 'head', 'options', 'put', 'delete'].includes(method),
    openWorldHint: true,
  };
}
