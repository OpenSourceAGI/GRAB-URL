# Runnable Examples

Each folder here is a self-contained project that demonstrates one usage pattern from [`grab-url`](https://github.com/vtempest/grab-url). They're linked from the docs (`grab-help-docs/content/docs/`) via the `<StackBlitzExample>` component, which opens a fresh, editable StackBlitz fork of the folder for the reader.

| Example | Demonstrates |
|---|---|
| `basic-request` | GET, query params, and POST |
| `reactive-react` | Reactive loading state (React) |
| `reactive-preact` | Reactive loading state (Preact) |
| `reactive-vue` | Reactive loading state (Vue, `<script setup>`) |
| `reactive-vue-options` | Reactive loading state (Vue, Options API) |
| `reactive-svelte` | Reactive loading state (Svelte 5) |
| `reactive-solid` | Reactive loading state (Solid) |
| `reactive-angular` | Reactive loading state (Angular signals) |
| `reactive-qwik` | Reactive loading state (Qwik) |
| `cookbook` | Debounce, cache, rate limiting, retry, interceptors, file upload |
| `api2client-petstore` | A generated OpenAPI SDK (Hey API) sending every request with grab |
| `openapi-mcp-docs` | One spec → a typed SDK, an MCP server and API docs, all sending with grab |

Each example installs and runs on its own:

```bash
cd examples/<name>
npm install
npm run dev
```
