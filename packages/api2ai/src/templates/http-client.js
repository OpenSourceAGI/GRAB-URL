/** `src/http-client.js` of the generated server: one outbound request per tool call. */
export function generateHttpClient() {
  return `// HTTP client for API requests
import { sanitizeHeaderParams, MAX_RESPONSE_BYTES, REQUEST_TIMEOUT_MS } from './policy.js';

/**
 * Join base URL and path template. Concatenated rather than \`new URL(path, base)\`:
 * an absolute path would drop the base's own path (\`/api/v3\` + \`/pet\` → \`/pet\`).
 */
export function buildUrl(baseUrl, pathTemplate, pathParams = {}) {
  let path = pathTemplate;
  for (const [key, value] of Object.entries(pathParams)) {
    path = path.replaceAll(\`{\${key}}\`, encodeURIComponent(String(value)));
  }
  return baseUrl.replace(/\\/+$/, '') + (path.startsWith('/') ? path : \`/\${path}\`);
}

export function buildQueryString(queryParams = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === null) continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      params.append(key, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
  }
  return params.toString();
}

function encodeBody(body, contentType) {
  if (typeof body === 'string') return body;
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return buildQueryString(body);
  }
  return JSON.stringify(body);
}

/** Read the body, aborting as soon as it exceeds MAX_RESPONSE_BYTES. */
async function readCapped(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error(\`Response body exceeds \${MAX_RESPONSE_BYTES} bytes\`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function executeRequest(toolConfig, args, config = {}) {
  const { baseUrl: configBaseUrl, headers: configHeaders = {} } = config;
  const baseUrl = configBaseUrl || toolConfig.baseUrl;
  if (!baseUrl) {
    throw new Error(\`No base URL configured for tool: \${toolConfig.name}. Set API_BASE_URL.\`);
  }

  const pathParams = {};
  const queryParams = {};
  const rawHeaderParams = {};

  for (const param of toolConfig.executionParameters || []) {
    const value = args[param.name];
    if (value === undefined) continue;
    if (param.in === 'path') pathParams[param.name] = value;
    else if (param.in === 'query') queryParams[param.name] = value;
    else if (param.in === 'header') rawHeaderParams[param.name] = value;
  }

  let url = buildUrl(baseUrl, toolConfig.pathTemplate, pathParams);
  const queryString = buildQueryString(queryParams);
  if (queryString) url += (url.includes('?') ? '&' : '?') + queryString;

  const method = toolConfig.method.toUpperCase();
  const hasBody = args.requestBody !== undefined && !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const contentType = toolConfig.requestBodyContentType || 'application/json';

  // configHeaders (auth) always win over spec-defined header params
  const headers = {
    Accept: 'application/json, */*;q=0.8',
    ...sanitizeHeaderParams(rawHeaderParams),
    ...configHeaders,
  };
  if (hasBody) headers['Content-Type'] = contentType;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: hasBody ? encodeBody(args.requestBody, contentType) : undefined,
      // A redirect could carry the Authorization header to another host.
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError') {
      throw new Error(\`\${method} \${url} timed out after \${REQUEST_TIMEOUT_MS}ms\`);
    }
    throw new Error(\`\${method} \${url} failed: \${err?.cause?.message || err?.message || err}\`);
  }

  const declaredLength = Number.parseInt(response.headers.get('content-length') || '0', 10);
  if (declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error(\`Response too large: \${declaredLength} bytes (max \${MAX_RESPONSE_BYTES})\`);
  }

  const text = await readCapped(response);
  let data = text;
  if ((response.headers.get('content-type') || '').includes('json') && text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Mislabelled body — hand the raw text back instead of failing the call.
    }
  }

  return { status: response.status, statusText: response.statusText, data, ok: response.ok };
}
`;
}
