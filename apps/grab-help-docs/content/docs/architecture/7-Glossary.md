# Glossary
Relevant source files
- [.github/workflows/tests.yml](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/.github/workflows/tests.yml)
- [codecov.yml](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/codecov.yml)
- [dist/grab-api.cjs.js](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.cjs.js)
- [dist/grab-api.cjs.js.map](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.cjs.js.map)
- [dist/grab-api.es.js](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js)
- [dist/grab-api.es.js.map](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js.map)
- [dist/grab-api/common/types.d.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api/common/types.d.ts)
- [docs/content/docs/openapi-services/heyapi-client-grab.mdx](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/openapi-services/heyapi-client-grab.mdx?plain=1)
- [docs/content/docs/testing.mdx](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/content/docs/testing.mdx?plain=1)
- [package-lock.json](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package-lock.json)
- [package.json](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package.json)
- [packages/archiver-web/package.json](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/archiver-web/package.json)
- [packages/archiver-web/tsconfig.json](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/archiver-web/tsconfig.json)
- [packages/grab-api/src/common/utils.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/grab-api/src/common/utils.ts)
- [packages/grab-api/src/core/request-executor-slim.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/grab-api/src/core/request-executor-slim.ts)
- [packages/grab-api/src/core/request-executor.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/grab-api/src/core/request-executor.ts)
- [packages/heyapi-client-grab/README.md](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/heyapi-client-grab/README.md?plain=1)
- [packages/heyapi-client-grab/package.json](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/heyapi-client-grab/package.json)
- [packages/heyapi-client-grab/src/client.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/heyapi-client-grab/src/client.ts)
- [packages/quantum-sphere-loading-animation/package.json](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/quantum-sphere-loading-animation/package.json)
- [packages/quantum-sphere-loading-animation/tsup.config.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/quantum-sphere-loading-animation/tsup.config.ts)
- [test/grab.test.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/test/grab.test.ts)
- [test/heyapi.test.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/test/heyapi.test.ts)
- [vite.config.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/vite.config.ts)

This page provides a comprehensive reference for the domain-specific terminology, internal abstractions, and technical concepts used throughout the **GRAB-URL** monorepo.

## Core API Concepts

### grab()

The primary request manager and entry point for the library. It is a functional wrapper around the `fetch` API that adds features like auto-detection of content types, mocking, and global configuration [package.json2-3](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package.json#L2-L3) In the browser, it is automatically attached to `window.grab`[dist/grab-api.es.js1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js#L1-L1)

### GrabOptions

The configuration object passed to a `grab()` call. It extends standard `RequestInit` and includes custom fields for flow control (debounce, rate limiting), pagination, and response processing (ZIP extraction, DOM parsing) [dist/grab-api/common/types.d.ts1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api/common/types.d.ts#L1-L1)

### grab.instance

A factory method that creates a new `grab` function with pre-configured default options. This allows developers to create specialized clients (e.g., an `apiGrab` with a specific `baseURL` and `headers`) [dist/grab-api.es.js1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js#L1-L1)

### Slim Build

A lightweight version of the library (`grab-url/slim`) that excludes heavy dependencies like `linkedom` (for DOM parsing) and `archiver-web` (for ZIP processing) [package.json31-35](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package.json#L31-L35) The system provides separate entry points in `package.json` to support this lightweight variant [package.json25-56](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package.json#L25-L56)

---

## Data Flow & Execution

The following diagram illustrates the relationship between the high-level `grab()` call and the underlying execution logic.

**Natural Language to Code Entity Mapping: Request Flow**

**Sources:**[dist/grab-api.es.js1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js#L1-L1)[dist/grab-api.es.js.map1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js.map#L1-L1)[packages/grab-api/src/core/request-executor.ts16-25](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/grab-api/src/core/request-executor.ts#L16-L25)

---

## Domain Concepts

### Content Auto-Detection

The system inspects the `content-type` header of a response to decide how to parse the data.

- **ZIP Detection:** If `application/zip` or `application/x-zip` is found and `unzip` isn't `false`, it triggers `processZipResponse` which dynamically imports `archiver-web`[dist/grab-api.es.js1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js#L1-L1)[dist/grab-api.es.js.map1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js.map#L1-L1)
- **HTML/DOM Detection:** If `text/html` is found or a `dom` selector is provided, it triggers `processDomResponse` using `linkedom`[dist/grab-api.es.js1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js#L1-L1)[dist/grab-api.es.js.map1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js.map#L1-L1)
- **Fallback Logic:** Defaults to `.json()` parsing, with special handling for `.blob()` (PDF/Octet-stream) and `.text()`[dist/grab-api.es.js1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js#L1-L1)

### Mocking System

A registry stored at `grab.mock`. It maps URL paths to `GrabMockHandler` objects. If a request path matches a key in this object, the `executeRequest` function returns the mock response (optionally delayed by `delay`) instead of performing a fetch [dist/grab-api.es.js1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js#L1-L1)[packages/grab-api/src/core/request-executor.ts26-35](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/grab-api/src/core/request-executor.ts#L26-L35)

### Infinite Scroll Persistence

A mechanism that saves the scroll position of a specific element to `localStorage` under the key `"scroll"`. On page load, a `DOMContentLoaded` listener restores the `scrollTop` and `scrollLeft` values to maintain user context [dist/grab-api.es.js1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js#L1-L1)

### Hey API Integration

The `heyapi-client-grab` package allows swapping the default transport of Hey API-generated SDKs with `grab()`. This enables features like caching and retries on every SDK endpoint without changing generated code [packages/heyapi-client-grab/README.md3-6](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/heyapi-client-grab/README.md?plain=1#L3-L6)

---

## Package Glossary

| Term | Package / File | Definition |
| --- | --- | --- |
| **archiver-web** | `packages/archiver-web` | Universal Archive Extractor/Creator using `fflate` and `jszip`. Frontend-only [packages/archiver-web/package.json2-4](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/archiver-web/package.json#L2-L4) |
| **heyapi-client-grab** | `packages/heyapi-client-grab` | OpenAPI SDK transport layer that replaces fetch/axios with `grab`[packages/heyapi-client-grab/package.json2-3](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/heyapi-client-grab/package.json#L2-L3) |
| **QuantumOrbital** | `packages/quantum-sphere...` | Parabolic spherical orbital loading component for React and Svelte [packages/quantum-sphere-loading-animation/package.json4-9](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/quantum-sphere-loading-animation/package.json#L4-L9) |
| **grab-url-cli** | `packages/grab-url-cli` | The command-line interface providing `grab`, `grab-url`, and `g` binaries [package.json20-24](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package.json#L20-L24) |
| **loading-animations** | `packages/loading-animations` | Collection of 17+ SVG and CLI emoji animations [package.json36-40](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package.json#L36-L40) |

---

## Infrastructure & Tooling

**Natural Language to Code Entity Mapping: Monorepo & Build**

**Sources:**[package.json62-71](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package.json#L62-L71)[package-lock.json41-60](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package-lock.json#L41-L60)[vite.config.ts63-89](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/vite.config.ts#L63-L89)

### Turbo / Workspace

The monorepo uses `bun` as the package manager and `Turbo` to manage builds across `packages/*` and `docs`[package.json6-16](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package.json#L6-L16)

### ship

A custom script that automates version bumping via `standard-version` and publishes to NPM [package.json67](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package.json#L67-L67)

### Documentation Site

Built with `Next.js` and `FumaDocs`, the site provides an interactive portal for API documentation and code visualization [package-lock.json41-60](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package-lock.json#L41-L60)

**Sources:**

- Request execution and auto-detection: [dist/grab-api.es.js1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js#L1-L1)[dist/grab-api.es.js.map1](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/dist/grab-api.es.js.map#L1-L1)[packages/grab-api/src/core/request-executor.ts1-76](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/grab-api/src/core/request-executor.ts#L1-L76)
- Package definitions: [package.json1-56](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package.json#L1-L56)[packages/archiver-web/package.json1-14](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/archiver-web/package.json#L1-L14)[packages/heyapi-client-grab/package.json1-10](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/heyapi-client-grab/package.json#L1-L10)[packages/quantum-sphere-loading-animation/package.json1-32](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/packages/quantum-sphere-loading-animation/package.json#L1-L32)
- Build and Docs: [package.json62-71](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package.json#L62-L71)[package-lock.json41-60](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/package-lock.json#L41-L60)[vite.config.ts59-112](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/vite.config.ts#L59-L112)