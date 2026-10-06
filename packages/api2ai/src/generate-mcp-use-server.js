#!/usr/bin/env node

/**
 * Former single-file entry point, kept so `node src/generate-mcp-use-server.js`
 * and imports of this path keep working. The code now lives in ./index.js
 * (library) and ./cli.js (command).
 */

import { main, isMainModule } from './cli.js';

export * from './index.js';

if (isMainModule(import.meta.url)) {
  main().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  });
}
