import fs from 'fs/promises';
import path from 'path';
import { loadOpenApiSpec } from './spec/load-spec.js';
import { extractTools } from './spec/extract-tools.js';
import { generatePackageJson } from './templates/package-json.js';
import { generateEnvFile } from './templates/env.js';
import { generatePolicy } from './templates/policy.js';
import { generateHttpClient } from './templates/http-client.js';
import { generateToolsConfig } from './templates/tools-config.js';
import { generateServerIndex } from './templates/server-index.js';
import { generateReadme } from './templates/readme.js';

/**
 * Render every file of the server without touching the disk.
 * @returns {{ files: Array<{ path: string, content: string }>, tools: object[], baseUrl?: string }}
 */
export function renderMcpServer(spec, options = {}) {
  const {
    serverName = 'openapi-mcp-server',
    port = 3000,
    specPath = '(in-memory spec)',
    requireApprovals = true,
  } = options;

  const tools = extractTools(spec, { ...options, specUrl: options.specUrl ?? specPath });
  const baseUrl = options.baseUrl || tools[0]?.baseUrl;

  const files = [
    { path: 'package.json', content: generatePackageJson(serverName, tools) },
    { path: '.env', content: generateEnvFile({ baseUrl, port, requireApprovals }) },
    { path: '.env.example', content: generateEnvFile({ baseUrl, port, requireApprovals, example: true }) },
    { path: 'src/policy.js', content: generatePolicy(baseUrl) },
    { path: 'src/http-client.js', content: generateHttpClient() },
    { path: 'src/tools-config.js', content: generateToolsConfig(tools) },
    { path: 'src/index.js', content: generateServerIndex(serverName, tools, baseUrl, port) },
    { path: 'README.md', content: generateReadme(serverName, tools, specPath, baseUrl, port) },
    { path: '.gitignore', content: 'node_modules/\n.env\n*.log\n.mcp-use/\n' },
  ];

  return { files, tools, baseUrl };
}

/**
 * Load a spec, generate an mcp-use server from it and write it to `outputFolder`.
 *
 * @param {string} specPathOrUrl local file or http(s) URL (JSON or YAML)
 * @param {string} outputFolder
 * @param {object} [options] see extractTools; plus serverName, port, requireApprovals, quiet
 */
export async function generateMcpServer(specPathOrUrl, outputFolder, options = {}) {
  const { port = 3000, quiet = false } = options;
  const log = quiet ? () => {} : console.log;

  log(`\n📖 Loading OpenAPI spec: ${specPathOrUrl}`);
  const spec = await loadOpenApiSpec(specPathOrUrl);
  log(`   Title: ${spec.info?.title || 'Unknown'}`);
  log(`   Version: ${spec.info?.version || 'Unknown'}`);

  const { files, tools } = renderMcpServer(spec, { ...options, specPath: specPathOrUrl });
  log(`✅ Extracted ${tools.length} tools\n`);

  for (const file of files) {
    const target = path.join(outputFolder, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    // An existing .env holds the user's credentials; regenerating must not wipe them.
    if (file.path === '.env' && await fs.access(target).then(() => true, () => false)) {
      log(`  • .env (kept existing)`);
      continue;
    }
    await fs.writeFile(target, file.content);
    log(`  ✓ ${file.path}`);
  }

  log(`
🎉 MCP server generated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  cd ${outputFolder}
  npm install
  npm start        # http://localhost:${port}/mcp
  npm run dev      # hot reload + Inspector at /mcp/inspector
`);

  return {
    outputFolder,
    toolCount: tools.length,
    tools: tools.map(t => t.name),
    port,
  };
}
