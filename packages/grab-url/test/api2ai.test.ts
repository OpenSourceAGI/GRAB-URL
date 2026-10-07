/**
 * @file api2ai.test.ts
 * @description The OpenAPI → mcp-use server generator: schema conversion,
 * tool extraction, CLI parsing, and that every generated file parses.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

import {
  schemaToZod,
  buildZodSchema,
  extractTools,
  resolveServerUrl,
  renderMcpServer,
  generateMcpServer,
  DEPENDENCY_VERSIONS,
} from '../../api2ai/src/index.js';
import { parseArgs } from '../../api2ai/src/cli.js';

const petSpec = {
  openapi: '3.0.3',
  info: { title: 'Pets', version: '1.0.0' },
  servers: [{ url: 'https://pets.example.com/api/v3' }],
  components: {
    schemas: {
      Pet: {
        type: 'object',
        required: ['name'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string', description: "The pet's \"name\"\nsecond line" },
          status: { type: 'string', enum: ['available', 'sold'] },
          tag: { type: 'string', nullable: true },
          children: { type: 'array', items: { $ref: '#/components/schemas/Pet' } },
        },
      },
    },
    parameters: {
      PetId: { name: 'petId', in: 'path', required: true, schema: { type: 'integer' } },
    },
  },
  paths: {
    '/pet/{petId}': {
      parameters: [{ $ref: '#/components/parameters/PetId' }],
      get: { operationId: 'getPetById', summary: 'Find pet by ID', tags: ['pet'] },
      delete: { operationId: 'deletePet', summary: 'Deletes a pet', tags: ['pet'] },
    },
    '/pet': {
      post: {
        operationId: 'addPet',
        summary: 'Add a new pet',
        tags: ['pet'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
        },
      },
    },
    '/store/inventory': {
      get: { operationId: 'get-inventory', tags: ['store'] },
    },
  },
};

describe('schemaToZod', () => {
  it('maps primitive types and formats to zod 4', () => {
    expect(schemaToZod({ type: 'integer' }, true)).toBe('z.int()');
    expect(schemaToZod({ type: 'string', format: 'email' }, true)).toBe('z.email()');
    expect(schemaToZod({ type: 'string', format: 'date-time' }, true)).toBe('z.iso.datetime({ offset: true })');
    expect(schemaToZod({ type: 'string' })).toBe('z.string().optional()');
  });

  it('handles nullable in both 3.0 and 3.1 spellings', () => {
    expect(schemaToZod({ type: 'string', nullable: true }, true)).toBe('z.string().nullable()');
    expect(schemaToZod({ type: ['string', 'null'] }, true)).toBe('z.string().nullable()');
  });

  it('escapes enum values and descriptions as JS string literals', () => {
    const zod = schemaToZod({ type: 'string', enum: ["it's", 'a"b'] }, true);
    expect(zod).toBe('z.enum(["it\'s", "a\\"b"])');
    expect(schemaToZod({ enum: [1, 2] }, true)).toBe('z.union([z.literal(1), z.literal(2)])');
  });

  it('resolves local $refs and cuts cycles', () => {
    const zod = schemaToZod({ $ref: '#/components/schemas/Pet' }, true, petSpec);
    expect(zod).toContain('name: z.string().describe(');
    expect(zod).toContain('children: z.array(z.unknown()).optional()');
  });

  it('merges object allOf members', () => {
    const zod = schemaToZod({
      allOf: [
        { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
        { type: 'object', properties: { b: { type: 'number' } } },
      ],
    }, true);
    expect(zod).toMatch(/a: z\.string\(\),\s+b: z\.number\(\)\.optional\(\)/);
  });
});

describe('extractTools', () => {
  const tools = extractTools(petSpec);
  const byName = Object.fromEntries(tools.map(t => [t.name, t]));

  it('extracts one tool per operation with sanitized names', () => {
    expect(tools.map(t => t.name)).toEqual(['getPetById', 'deletePet', 'addPet', 'get-inventory']);
  });

  it('resolves $ref parameters and requires path params', () => {
    expect(byName.getPetById.executionParameters).toEqual([{ name: 'petId', in: 'path' }]);
    expect(byName.getPetById.zodSchema).toContain('petId: z.int()');
    expect(byName.getPetById.zodSchema).not.toContain('optional');
  });

  it('classifies risk and sets MCP annotations', () => {
    expect(byName.getPetById.riskLevel).toBe('low');
    expect(byName.getPetById.annotations.readOnlyHint).toBe(true);
    expect(byName.deletePet.riskLevel).toBe('high');
    expect(byName.deletePet.annotations.destructiveHint).toBe(true);
    expect(byName.addPet.riskLevel).toBe('medium');
    expect(byName.addPet.requestBodyContentType).toBe('application/json');
  });

  it('lets --allow-mutations enable medium-risk tools only', () => {
    const allowed = extractTools(petSpec, { allowMutations: true });
    expect(allowed.find(t => t.name === 'addPet')?.enabledByDefault).toBe(true);
    expect(allowed.find(t => t.name === 'deletePet')?.enabledByDefault).toBe(false);
  });

  it('filters by tag', () => {
    expect(extractTools(petSpec, { includeTags: ['store'] }).map(t => t.name)).toEqual(['get-inventory']);
    expect(extractTools(petSpec, { excludeTags: ['pet'] }).map(t => t.name)).toEqual(['get-inventory']);
  });

  it('de-duplicates tool names that sanitize identically', () => {
    const spec = { paths: { '/a': { get: { operationId: 'a.b' } }, '/b': { get: { operationId: 'a_b' } } } };
    expect(extractTools(spec).map(t => t.name)).toEqual(['a_b', 'a_b_2']);
  });

  it('lets an operation parameter override a path-level one', () => {
    const zod = buildZodSchema(
      { parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'integer' } }] },
      [{ name: 'q', in: 'query', schema: { type: 'string' } }],
    );
    expect(zod.match(/q:/g)).toHaveLength(1);
    expect(zod).toContain('q: z.int()');
  });
});

describe('resolveServerUrl', () => {
  it('substitutes server variables and resolves relative URLs', () => {
    expect(resolveServerUrl({
      servers: [{ url: 'https://{region}.example.com/v1/', variables: { region: { default: 'eu' } } }],
    })).toBe('https://eu.example.com/v1');
    expect(resolveServerUrl({ servers: [{ url: '/api/v3' }] }, 'https://petstore3.swagger.io/api/v3/openapi.json'))
      .toBe('https://petstore3.swagger.io/api/v3');
    expect(resolveServerUrl({ servers: [{ url: '/api/v3' }] }, './local.json')).toBeUndefined();
  });
});

describe('renderMcpServer', () => {
  const { files } = renderMcpServer(petSpec, { serverName: 'pets-mcp', port: 4321, requireApprovals: false });
  const file = (p: string) => files.find(f => f.path === p)!.content;

  it('pins the mcp-use 2.x API it was written for', () => {
    const pkg = JSON.parse(file('package.json'));
    expect(pkg.dependencies['mcp-use']).toBe(DEPENDENCY_VERSIONS['mcp-use']);
    expect(pkg.dependencies['mcp-use']).toMatch(/^\^2\./);
    expect(pkg.dependencies.dotenv).toBeUndefined();
    expect(file('src/index.js')).toContain("import { MCPServer } from 'mcp-use';");
    expect(file('src/index.js')).toContain('inputSchema: z.object(');
  });

  it('writes --approve-writes into the generated .env', () => {
    expect(file('.env')).toContain('REQUIRE_APPROVALS=false');
    expect(file('.env.example')).toContain('API_KEY=your-api-key-here');
  });

  it('bakes the spec host in as the default API host allowlist', () => {
    expect(file('src/policy.js')).toContain('const SPEC_API_HOST = "pets.example.com";');
  });

  it('emits JavaScript that parses', () => {
    const dir = mkdtempSync(join(tmpdir(), 'api2ai-syntax-'));
    try {
      writeFileSync(join(dir, 'package.json'), file('package.json'));
      for (const p of ['src/index.js', 'src/policy.js', 'src/http-client.js', 'src/tools-config.js']) {
        const target = join(dir, p.replace('src/', ''));
        writeFileSync(target, file(p));
        // --check parses as ESM (package.json "type": "module") without running it.
        expect(() => execFileSync(process.execPath, ['--check', target], { stdio: 'pipe' }), p).not.toThrow();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('generated http-client', () => {
  it('keeps the base URL path when joining an absolute path template', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'api2ai-client-'));
    try {
      const { files } = renderMcpServer(petSpec);
      for (const name of ['policy.js', 'http-client.js']) {
        writeFileSync(join(dir, name), files.find(f => f.path === `src/${name}`)!.content);
      }
      const client = await import(pathToFileURL(join(dir, 'http-client.js')).href);
      expect(client.buildUrl('https://x.test/api/v3/', '/pet/{petId}', { petId: 'a/b' }))
        .toBe('https://x.test/api/v3/pet/a%2Fb');
      expect(client.buildQueryString({ tags: ['a', 'b'], skip: undefined })).toBe('tags=a&tags=b');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('generateMcpServer', () => {
  it('writes the server and keeps an existing .env', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'api2ai-'));
    try {
      const specPath = join(dir, 'spec.json');
      writeFileSync(specPath, JSON.stringify(petSpec));
      const out = join(dir, 'server');

      const result = await generateMcpServer(specPath, out, { serverName: 'pets', quiet: true });
      expect(result.toolCount).toBe(4);
      expect(existsSync(join(out, 'src/index.js'))).toBe(true);

      writeFileSync(join(out, '.env'), 'API_KEY=secret\n');
      await generateMcpServer(specPath, out, { serverName: 'pets', quiet: true });
      expect(readFileSync(join(out, '.env'), 'utf8')).toBe('API_KEY=secret\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('api2ai CLI', () => {
  it('parses options', () => {
    expect(parseArgs(['spec.json', 'out', '--name', 'n', '--port', '8080', '--approve-writes', '--include-tags', 'a, b']))
      .toMatchObject({ specPath: 'spec.json', outputFolder: 'out', serverName: 'n', port: 8080, requireApprovals: false, includeTags: ['a', 'b'] });
  });

  it('rejects unknown flags and bad ports', () => {
    expect(() => parseArgs(['spec.json', '--nope'])).toThrow(/Unknown option/);
    expect(() => parseArgs(['spec.json', '--port', 'abc'])).toThrow(/Invalid --port/);
  });
});
