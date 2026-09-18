/**
 * `npx api2ai ./openapi.json ./mcp-server` turns every operation in the spec
 * into one MCP tool, named after its operationId. This derives the same list
 * from the spec so the page can show what the generated server exposes without
 * having to run it — see the README for connecting an agent to the real thing.
 *
 * What the page cannot show is the generator's risk classification: api2ai
 * scores each operation (writes, and anything whose name or path mentions
 * auth, payments, users, keys, deletion…) and leaves anything above `low`
 * disabled behind an approval gate. The generated `src/tools-config.js` carries
 * the verdict per tool.
 */
type Operation = {
  operationId?: string;
  summary?: string;
  parameters?: Array<{ name: string; required?: boolean }>;
};

type Spec = {
  paths: Record<string, Record<string, Operation>>;
};

export function describeMcpTools(spec: Spec): string {
  const lines: string[] = [];

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const name = operation.operationId ?? `${method}_${path}`;
      const args = (operation.parameters ?? [])
        .map((p) => (p.required ? p.name : `${p.name}?`))
        .join(", ");

      lines.push(`${name}(${args})`);
      lines.push(`    ${method.toUpperCase()} ${path} — ${operation.summary ?? ""}`);
    }
  }

  return lines.join("\n");
}
