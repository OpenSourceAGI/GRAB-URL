import fs from 'fs/promises';

const isUrl = (s) => s.startsWith('http://') || s.startsWith('https://');
const looksLikeYaml = (name) => /\.ya?ml($|\?)/i.test(name);

async function parseYaml(content) {
  const yaml = await import('js-yaml').catch(() => null);
  if (!yaml) {
    throw new Error('YAML spec detected but js-yaml is not installed. Run: npm install js-yaml');
  }
  return (yaml.default || yaml).load(content);
}

/**
 * Parse spec text as JSON, falling back to YAML when the source says it is
 * YAML (extension or content-type) or when the JSON parse fails — remote
 * specs are often served as text/plain whatever their format.
 */
async function parseSpecText(content, { source, contentType = '' }) {
  if (looksLikeYaml(source) || /yaml/i.test(contentType)) {
    return parseYaml(content);
  }
  try {
    return JSON.parse(content);
  } catch (jsonError) {
    try {
      return await parseYaml(content);
    } catch {
      throw new Error(`Could not parse spec ${source} as JSON: ${jsonError.message}`);
    }
  }
}

/** Load an OpenAPI document from a local path or an http(s) URL. */
export async function loadOpenApiSpec(specPathOrUrl) {
  let spec;
  if (isUrl(specPathOrUrl)) {
    const response = await fetch(specPathOrUrl, { headers: { Accept: 'application/json, application/yaml, text/yaml, */*' } });
    if (!response.ok) {
      throw new Error(`Failed to fetch spec: ${response.status} ${response.statusText}`);
    }
    spec = await parseSpecText(await response.text(), {
      source: specPathOrUrl,
      contentType: response.headers.get('content-type') || '',
    });
  } else {
    const content = await fs.readFile(specPathOrUrl, 'utf-8');
    spec = await parseSpecText(content, { source: specPathOrUrl });
  }

  if (!spec || typeof spec !== 'object' || !spec.paths) {
    throw new Error(`${specPathOrUrl} is not an OpenAPI document (no "paths" object)`);
  }
  return spec;
}
