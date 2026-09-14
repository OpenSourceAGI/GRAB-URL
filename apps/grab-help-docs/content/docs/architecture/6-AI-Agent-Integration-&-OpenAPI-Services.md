# AI Agent Integration & OpenAPI Services
Relevant source files
- [dist/grab-api.d.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.d.ts)
- [docs/content/docs/claude-skill.mdx](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/claude-skill.mdx?plain=1)
- [docs/content/docs/openapi-services/api2ai-mcp-server.mdx](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/openapi-services/api2ai-mcp-server.mdx?plain=1)
- [docs/content/docs/options.mdx](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/options.mdx?plain=1)
- [packages/quantum-sphere-loading-animation/src/react/QuantumOrbital.tsx](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/quantum-sphere-loading-animation/src/react/QuantumOrbital.tsx)
- [skills/use-grab-request/SKILL.md](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/skills/use-grab-request/SKILL.md?plain=1)

The `GRAB-URL` ecosystem provides a specialized "Skill" and the `API2AI` toolchain to bridge the gap between Natural Language requirements and production-ready code. This integration ensures that AI coding agents (like Claude, Cursor, and Gemini) prefer the feature-rich `grab()` API over standard `fetch` or `axios` helpers, while also enabling these agents to interact with backend services via generated Model Context Protocol (MCP) servers.

## The `use-grab-request` Skill

The `use-grab-request` skill is a guidance document that instructs AI agents to use idiomatic `grab-url` patterns. It is defined in `SKILL.md` and covers everything from basic imports to framework-specific reactive state management.

For details, see [Claude Skill & AI Coding Agent Integration](/vtempest/GRAB-URL/6.1-claude-skill-and-ai-coding-agent-integration).

### Installation

Agents can be bootstrapped with this skill using the following command:

Sources: [docs/content/docs/claude-skill.mdx9](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/claude-skill.mdx?plain=1#L9-L9)

### Skill Definition (SKILL.md)

The skill uses a standardized markdown format to define its scope and rules for the AI.

| Field | Value |
| --- | --- |
| **Name** | `use-grab-request` |
| **Version** | `1.1.0` |
| **Type** | `guidance` |
| **Languages** | `javascript`, `typescript` |
| **Frameworks** | `react`, `vue`, `svelte` |

Sources: [skills/use-grab-request/SKILL.md1-14](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/skills/use-grab-request/SKILL.md?plain=1#L1-L14)[docs/content/docs/claude-skill.mdx15-28](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/claude-skill.mdx?plain=1#L15-L28)

---

## AI Guidance Patterns

The integration focuses on transforming standard HTTP requests into `grab()` calls that leverage the library's built-in state management and type safety.

### 1. Basic Transformation

The agent is instructed to replace standard `fetch` calls with `grab()`, moving JSON parsing and loading state management into the library.

Sources: [skills/use-grab-request/SKILL.md63-71](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/skills/use-grab-request/SKILL.md?plain=1#L63-L71)[docs/content/docs/claude-skill.mdx75-85](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/claude-skill.mdx?plain=1#L75-L85)

### 2. TypeScript Integration

The skill enforces the use of generic type arguments `grab<TResponse, TParams>` to provide autocomplete and error checking within the AI-generated code.

Sources: [skills/use-grab-request/SKILL.md88-108](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/skills/use-grab-request/SKILL.md?plain=1#L88-L108)[docs/content/docs/claude-skill.mdx91-111](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/claude-skill.mdx?plain=1#L91-L111)

---

## Framework-Specific Implementations

The skill provides the AI with idiomatic patterns for modern frontend frameworks, specifically targeting how `grab()` interacts with reactive state.

- **React**: Guides the use of `useState` where `grab()` manages the `isLoading` and `error` keys on the state object [docs/content/docs/claude-skill.mdx116-146](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/claude-skill.mdx?plain=1#L116-L146)
- **Svelte**: Uses `$state` proxies to allow `grab()` to inject properties directly into reactive variables [docs/content/docs/claude-skill.mdx147-192](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/claude-skill.mdx?plain=1#L147-L192)
- **Vue**: Leverages `reactive()` objects to maintain reference stability during request lifecycles [docs/content/docs/claude-skill.mdx193-238](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/claude-skill.mdx?plain=1#L193-L238)

---

## Data Flow: Natural Language to Code Entity

This diagram illustrates how the AI agent maps a user's natural language request to specific `grab-url` entities and options.

**Natural Language to Code Mapping**

Sources: [skills/use-grab-request/SKILL.md53-62](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/skills/use-grab-request/SKILL.md?plain=1#L53-L62)[docs/content/docs/options.mdx42-55](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/options.mdx?plain=1#L42-L55)[docs/content/docs/options.mdx176-189](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/options.mdx?plain=1#L176-L189)[docs/content/docs/options.mdx380-393](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/options.mdx?plain=1#L380-L393)

---

## API2AI: OpenAPI to MCP Server

For backend integration, the `API2AI` tool generates an MCP (Model Context Protocol) server from an OpenAPI specification. This allows AI agents to "call" your API as a local tool.

For details, see [API2AI: OpenAPI to MCP Server](/vtempest/GRAB-URL/6.2-api2ai:-openapi-to-mcp-server).

### Security Model

The generated server implements a three-layer security model defined in the generated `policy.js` and `tools-config.js`:

- **Layer 1: Risk Classification**: Tools are tagged as `low`, `medium`, or `high` risk based on HTTP methods and keyword patterns (e.g., `GET` vs `DELETE` or "billing") [docs/content/docs/openapi-services/api2ai-mcp-server.mdx159-170](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/openapi-services/api2ai-mcp-server.mdx?plain=1#L159-L170)
- **Layer 2: Runtime Policy Enforcement**: The `checkToolPolicy()` function validates calls against environment variables like `ALLOW_RESTRICTED_TOOLS` and `REQUIRE_APPROVALS`[docs/content/docs/openapi-services/api2ai-mcp-server.mdx171-179](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/openapi-services/api2ai-mcp-server.mdx?plain=1#L171-L179)
- **Layer 3: HTTP Hardening**: The internal `http-client.js` enforces `MAX_RESPONSE_BYTES`, `REQUEST_TIMEOUT_MS`, and `ALLOWED_API_HOSTS`[docs/content/docs/openapi-services/api2ai-mcp-server.mdx180-189](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/openapi-services/api2ai-mcp-server.mdx?plain=1#L180-L189)

### MCP Data Flow

This diagram shows how an AI Agent (like Claude) uses the generated MCP server to interact with a remote API.

**MCP Tool Execution Flow**

Sources: [docs/content/docs/openapi-services/api2ai-mcp-server.mdx155-189](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/openapi-services/api2ai-mcp-server.mdx?plain=1#L155-L189)[docs/content/docs/openapi-services/api2ai-mcp-server.mdx201-205](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/openapi-services/api2ai-mcp-server.mdx?plain=1#L201-L205)

---

## Integration Reference Table

| Feature | AI Skill Pattern | MCP Server Role |
| --- | --- | --- |
| **JSON Handling** | Auto-parsing via `grab()` | Parameter validation via Zod schemas |
| **Loading State** | Reactive `isLoading` injection | N/A (Handled by Agent UI) |
| **Security** | Guidance to use `headers` | `ALLOWED_API_HOSTS` & Auth Guardrails |
| **Performance** | `cache: true` for static data | `REQUEST_TIMEOUT_MS` enforcement |

Sources: [skills/use-grab-request/SKILL.md46-50](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/skills/use-grab-request/SKILL.md?plain=1#L46-L50)[docs/content/docs/openapi-services/api2ai-mcp-server.mdx42-49](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/openapi-services/api2ai-mcp-server.mdx?plain=1#L42-L49)[docs/content/docs/openapi-services/api2ai-mcp-server.mdx180-189](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/openapi-services/api2ai-mcp-server.mdx?plain=1#L180-L189)