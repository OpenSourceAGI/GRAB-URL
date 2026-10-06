/**
 * `.env` and `.env.example`. They differ only in placeholder credentials, so
 * one template renders both (they used to be two copies that drifted).
 */
export function generateEnvFile({ baseUrl, port, requireApprovals = true, example = false }) {
  const apiHost = safeHost(baseUrl);
  return `# Server Configuration
PORT=${port}
# 127.0.0.1 locally; set HOST=0.0.0.0 to serve on a network / in a container
# HOST=0.0.0.0
NODE_ENV=development

# API Configuration
API_BASE_URL=${baseUrl || 'https://api.example.com'}

# Authentication
${example ? 'API_KEY=your-api-key-here' : '# API_KEY=your-api-key'}
# API_AUTH_HEADER=Header-Name:header-value

# Security — allowed API hosts (comma-separated). Empty = only API_BASE_URL's host${apiHost ? ` (${apiHost})` : ''}.
# ALLOWED_API_HOSTS=${apiHost || 'api.example.com'}

# Tool policy — set to true to allow medium/high-risk (mutating) tools
ALLOW_RESTRICTED_TOOLS=false
# Set to false to bypass per-call approval requirement for restricted tools
REQUIRE_APPROVALS=${requireApprovals ? 'true' : 'false'}

# Request limits
REQUEST_TIMEOUT_MS=30000
MAX_RESPONSE_BYTES=10485760

# Public URL of this server, when it sits behind a proxy
# MCP_URL=https://your-production-url.com

# Browser origins allowed to call /mcp (comma-separated hostnames or URLs)
# ALLOWED_ORIGINS=app1.com,https://app2.com
`;
}

function safeHost(url) {
  try {
    return url ? new URL(url).host : '';
  } catch {
    return '';
  }
}
