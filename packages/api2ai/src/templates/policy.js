import { literal } from '../spec/schema-to-zod.js';

/** `src/policy.js` of the generated server: tool policy, host allowlist, header filter. */
export function generatePolicy(baseUrl) {
  let specHost = '';
  try {
    specHost = baseUrl ? new URL(baseUrl).host : '';
  } catch { /* relative or templated server URL — no default allowlist */ }

  return `// Runtime security policy for the generated MCP server

const BLOCKED_HEADER_NAMES = new Set([
  'authorization', 'cookie', 'set-cookie', 'x-api-key',
  'x-auth-token', 'proxy-authorization', 'www-authenticate',
  'host', 'content-length', 'transfer-encoding', 'connection',
]);

// The API host the spec declares. With ALLOWED_API_HOSTS unset, only this
// host may be called, so a tampered API_BASE_URL cannot redirect credentials.
const SPEC_API_HOST = ${literal(specHost)};

const intEnv = (name, fallback) => {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const MAX_RESPONSE_BYTES = intEnv('MAX_RESPONSE_BYTES', 10 * 1024 * 1024);
export const REQUEST_TIMEOUT_MS = intEnv('REQUEST_TIMEOUT_MS', 30_000);

/** Drop credential and hop-by-hop headers a tool argument tries to set. */
export function sanitizeHeaderParams(headerParams = {}) {
  const out = {};
  for (const [k, v] of Object.entries(headerParams)) {
    if (!BLOCKED_HEADER_NAMES.has(k.toLowerCase())) out[k] = String(v);
  }
  return out;
}

export function assertAllowedBaseUrl(baseUrl) {
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(\`Unsupported API protocol: \${url.protocol}\`);
  }
  const configured = (process.env.ALLOWED_API_HOSTS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const allowedHosts = configured.length > 0 ? configured : [SPEC_API_HOST].filter(Boolean);
  if (allowedHosts.length > 0 && !allowedHosts.includes(url.host)) {
    throw new Error(\`Disallowed API host: \${url.host}. Add it to ALLOWED_API_HOSTS to allow it.\`);
  }
}

export function checkToolPolicy(toolConfig) {
  if (!toolConfig.enabledByDefault && process.env.ALLOW_RESTRICTED_TOOLS !== 'true') {
    throw new Error(
      \`Tool '\${toolConfig.name}' is disabled by policy (riskLevel: \${toolConfig.riskLevel}). \` +
      'Set ALLOW_RESTRICTED_TOOLS=true to enable restricted tools.'
    );
  }
  if (toolConfig.requiresApproval && process.env.REQUIRE_APPROVALS !== 'false') {
    throw new Error(
      \`Tool '\${toolConfig.name}' requires approval (riskLevel: \${toolConfig.riskLevel}). \` +
      'Set REQUIRE_APPROVALS=false to bypass, or route through an approval handler.'
    );
  }
}
`;
}
