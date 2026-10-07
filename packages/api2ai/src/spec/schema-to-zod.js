/**
 * OpenAPI schema → Zod source code (a string the generated server evaluates).
 *
 * Every user-controlled string that lands in generated code goes through
 * `literal()` (JSON.stringify): a description containing a newline, a
 * backslash or `*\/` used to produce a server that failed to parse.
 */

/** A JS string literal safe to splice into generated source. */
export const literal = (value) => JSON.stringify(String(value));

/** A JS object key: bare when it is an identifier, quoted otherwise. */
export function sanitizePropertyName(name) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? name : literal(name);
}

const describe = (text) => (text ? `.describe(${literal(text)})` : '');

/** Follow a local `#/components/...` JSON pointer. External refs are not fetched. */
function resolveRef(ref, spec) {
  if (!ref.startsWith('#/')) return null;
  let node = spec;
  for (const raw of ref.slice(2).split('/')) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    node = node?.[key];
    if (node === undefined) return null;
  }
  return node;
}

function literalUnion(values) {
  const nonNull = values.filter(v => v !== null);
  const parts = nonNull.map(v => `z.literal(${JSON.stringify(v)})`);
  let zod = parts.length === 0 ? 'z.null()' : parts.length === 1 ? parts[0] : `z.union([${parts.join(', ')}])`;
  if (nonNull.length !== values.length && parts.length > 0) zod += '.nullable()';
  return zod;
}

function stringZod(schema) {
  switch (schema.format) {
    // offset: true — LLMs routinely send `2024-01-01T00:00:00+02:00`.
    case 'date-time': return 'z.iso.datetime({ offset: true })';
    case 'date': return 'z.iso.date()';
    case 'email': return 'z.email()';
    case 'uri':
    case 'url': return 'z.url()';
    case 'uuid': return 'z.uuid()';
    default: return 'z.string()';
  }
}

function objectZod(schema, ctx, depth) {
  const pad = '  '.repeat(depth + 2);
  const closePad = '  '.repeat(depth + 1);
  const props = Object.entries(schema.properties || {});

  if (props.length === 0) {
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      return `z.record(z.string(), ${toZod(schema.additionalProperties, ctx, true, depth + 1)})`;
    }
    return 'z.record(z.string(), z.unknown())';
  }

  const body = props
    .map(([key, val]) => {
      const isReq = (schema.required || []).includes(key);
      const resolved = val?.$ref ? resolveRef(val.$ref, ctx.spec) || val : val;
      return `${pad}${sanitizePropertyName(key)}: ${toZod(val, ctx, isReq, depth + 1)}${describe(resolved?.description)}`;
    })
    .join(',\n');

  // zod 4's z.object() strips unknown keys; keep them when the spec allows extras.
  const ctor = schema.additionalProperties ? 'z.looseObject' : 'z.object';
  return `${ctor}({\n${body}\n${closePad}})`;
}

/** Merge `allOf` members that are plain objects into one object schema. */
function mergeAllOf(members, ctx) {
  const resolved = members.map(m => (m?.$ref ? resolveRef(m.$ref, ctx.spec) : m));
  if (!resolved.every(m => m && (m.type === 'object' || m.properties) && !m.allOf && !m.oneOf && !m.anyOf)) {
    return null;
  }
  return {
    type: 'object',
    properties: Object.assign({}, ...resolved.map(m => m.properties || {})),
    required: resolved.flatMap(m => m.required || []),
    additionalProperties: resolved.some(m => m.additionalProperties),
  };
}

function toZod(schema, ctx, required, depth) {
  let zod = baseZod(schema, ctx, depth);
  if (!required) zod += '.optional()';
  return zod;
}

function baseZod(schema, ctx, depth) {
  if (!schema || typeof schema !== 'object') return 'z.unknown()';

  if (schema.$ref) {
    // A cycle (Node.children: Node[]) is cut to z.unknown() rather than
    // expanding forever; z.lazy would need named declarations in the output.
    if (ctx.seen.has(schema.$ref)) return 'z.unknown()';
    const target = resolveRef(schema.$ref, ctx.spec);
    if (!target) return 'z.unknown()';
    ctx.seen.add(schema.$ref);
    try {
      return baseZod(target, ctx, depth);
    } finally {
      ctx.seen.delete(schema.$ref);
    }
  }

  // OpenAPI 3.1: `type: ['string', 'null']`; 3.0: `nullable: true`.
  let type = schema.type;
  let nullable = schema.nullable === true;
  if (Array.isArray(type)) {
    nullable = nullable || type.includes('null');
    const rest = type.filter(t => t !== 'null');
    if (rest.length !== 1) {
      return rest.length === 0 ? 'z.null()' : `z.union([${rest.map(t => baseZod({ ...schema, type: t }, ctx, depth)).join(', ')}])${nullable ? '.nullable()' : ''}`;
    }
    type = rest[0];
  }
  if (!type && schema.properties) type = 'object';
  if (!type && schema.items) type = 'array';

  let zod;
  if (schema.const !== undefined) {
    zod = `z.literal(${JSON.stringify(schema.const)})`;
  } else if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    zod = schema.enum.every(v => typeof v === 'string')
      ? `z.enum([${schema.enum.map(v => literal(v)).join(', ')}])`
      : literalUnion(schema.enum);
  } else if (schema.allOf) {
    const merged = mergeAllOf(schema.allOf, ctx);
    zod = merged
      ? objectZod(merged, ctx, depth)
      : schema.allOf.map(s => baseZod(s, ctx, depth)).reduce((a, b) => `z.intersection(${a}, ${b})`);
  } else if (schema.anyOf || schema.oneOf) {
    const options = (schema.anyOf || schema.oneOf).map(s => baseZod(s, ctx, depth));
    zod = options.length === 1 ? options[0] : `z.union([${options.join(', ')}])`;
  } else {
    switch (type) {
      case 'string': zod = stringZod(schema); break;
      case 'integer': zod = 'z.int()'; break;
      case 'number': zod = 'z.number()'; break;
      case 'boolean': zod = 'z.boolean()'; break;
      case 'null': zod = 'z.null()'; break;
      case 'array': zod = `z.array(${baseZod(schema.items, ctx, depth)})`; break;
      case 'object': zod = objectZod(schema, ctx, depth); break;
      default: zod = 'z.unknown()';
    }
  }

  return nullable && !zod.endsWith('.nullable()') ? `${zod}.nullable()` : zod;
}

/**
 * Zod source for one schema.
 * @param {object} schema OpenAPI schema object (may be a `$ref`)
 * @param {boolean} [required=false] omit `.optional()`
 * @param {object} [spec] the whole document, for resolving local `$ref`s
 */
export function schemaToZod(schema, required = false, spec = {}) {
  return toZod(schema, { spec, seen: new Set() }, required, 0);
}

/** Resolve a `$ref`'d parameter or request body; returns the input otherwise. */
export function deref(node, spec) {
  return node?.$ref ? resolveRef(node.$ref, spec) || node : node;
}

/**
 * The `z.object({...})` source for a tool's input: every path/query/header
 * parameter, plus `requestBody` when the operation takes one.
 */
export function buildZodSchema(operation, pathParams = [], spec = {}) {
  const ctx = { spec, seen: new Set() };
  const properties = [];

  for (const param of mergeParameters(pathParams, operation.parameters, spec)) {
    if (param.in === 'cookie') continue; // the HTTP client never sends cookies
    const zodType = toZod(param.schema || { type: 'string' }, ctx, param.in === 'path' || param.required, 1);
    properties.push(`    ${sanitizePropertyName(param.name)}: ${zodType}${describe(param.description)}`);
  }

  const body = deref(operation.requestBody, spec);
  if (body?.content) {
    const mediaType = body.content['application/json'] || Object.values(body.content)[0];
    if (mediaType?.schema) {
      const zodType = toZod(mediaType.schema, ctx, Boolean(body.required), 1);
      properties.push(`    requestBody: ${zodType}${describe(body.description || 'Request body')}`);
    }
  }

  return properties.length === 0 ? 'z.object({})' : `z.object({\n${properties.join(',\n')}\n  })`;
}

/**
 * Path-item parameters merged with operation parameters. Per the OpenAPI
 * spec an operation parameter overrides a path-level one with the same
 * name + location (it used to be emitted twice — a duplicate object key).
 */
export function mergeParameters(pathParams = [], operationParams = [], spec = {}) {
  const byKey = new Map();
  for (const raw of [...pathParams, ...operationParams]) {
    const param = deref(raw, spec);
    if (!param?.name) continue;
    byKey.set(`${param.in}:${param.name}`, param);
  }
  return [...byKey.values()];
}
