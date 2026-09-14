# Documentation Site (grab.js.org)
Relevant source files
- [docs/.gitignore](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/.gitignore)
- [docs/app/(home)/page.tsx](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/app/(home)/page.tsx)/page.tsx)
- [docs/app/layout.config.tsx](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/app/layout.config.tsx)
- [docs/components/DocsHomepage/footer.tsx](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/components/DocsHomepage/footer.tsx)
- [docs/components/fumadocs/layout/breadcrumb.tsx](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/components/fumadocs/layout/breadcrumb.tsx)
- [docs/lib/fumadocs/source.tsx](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/lib/fumadocs/source.tsx)
- [docs/next-env.d.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/next-env.d.ts)
- [docs/next.config.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/next.config.ts)
- [docs/open-next.config.ts](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/open-next.config.ts)
- [docs/package.json](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/package.json)
- [docs/wrangler.jsonc](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/wrangler.jsonc)

The `grab-url` documentation site is a modern, interactive portal built with **Next.js 16** and **FumaDocs**. It serves as both a technical reference and a live demonstration of the library's capabilities. The site is optimized for high performance and deployed on **Cloudflare Pages** using **OpenNext** and **Vinext**.

Beyond static documentation, the site features a custom "Code Entity Space" visualization engine that parses the monorepo's source code to generate interactive dependency graphs and type-safe code trees.

## System Architecture Overview

The documentation infrastructure is designed to be "AI-friendly" and highly interactive. It uses a custom content pipeline to transform MDX and TypeScript source files into a searchable, structured documentation site.

### Documentation Tech Stack

| Component | Technology | Role |
| --- | --- | --- |
| **Framework** | Next.js 16+ | Application framework [docs/package.json39](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/package.json#L39-L39) |
| **Docs Engine** | FumaDocs | MDX processing, sidebar, and search [docs/package.json29-33](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/package.json#L29-L33) |
| **Deployment** | Cloudflare Pages | Edge hosting via `vinext` and `wrangler`[docs/package.json13-16](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/package.json#L13-L16) |
| **Search** | Orama | High-performance full-text search [docs/package.json20](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/package.json#L20-L20) |
| **Visualization** | Mermaid.js | Renders C4-model dependency graphs [docs/package.json38](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/package.json#L38-L38) |

### Code-to-Entity Mapping

The following diagram illustrates how source code entities are transformed into documentation components.

Sources: [docs/package.json19-33](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/package.json#L19-L33)[docs/next.config.ts22-29](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/next.config.ts#L22-L29)[docs/lib/fumadocs/source.tsx15-19](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/lib/fumadocs/source.tsx#L15-L19)

## Infrastructure & Deployment

The site utilizes a specialized deployment pipeline for Cloudflare. It uses `vinext` for building and `wrangler` for environment management [docs/package.json13-16](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/package.json#L13-L16) A key feature is the **LLM-readable route generation**, which rewrites `.mdx` requests to a specialized route for AI consumption via `next.config.ts` rewrites [docs/next.config.ts22-29](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/next.config.ts#L22-L29) The configuration enables `nodejs_compat` to support heavy processing tasks on the edge [docs/wrangler.jsonc6](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/wrangler.jsonc#L6-L6) The build process is orchestrated by `open-ready` and `vinext`[docs/package.json7-13](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/package.json#L7-L13)

For details, see [Docs Site Infrastructure & Deployment](/vtempest/GRAB-URL/5.1-docs-site-infrastructure-and-deployment).
Sources: [docs/package.json7-16](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/package.json#L7-L16)[docs/next.config.ts22-29](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/next.config.ts#L22-L29)[docs/wrangler.jsonc1-21](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/wrangler.jsonc#L1-L21)[docs/open-next.config.ts3-6](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/open-next.config.ts#L3-L6)

## Homepage & UI Components

The landing page features a bespoke "Beige/Sand Desert Paper" theme. It includes interactive elements like the `HeroSection`, `FeaturesGrid`, and `ComparisonTable` to demonstrate `grab()` vs. standard `fetch()`[docs/app/(home)/page.tsx5-24](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/app/(home)/page.tsx#L5-L24) Navigation is managed through `baseOptions` in the layout config, which integrates the project logo and GitHub links [docs/app/layout.config.tsx9-27](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/app/layout.config.tsx#L9-L27)

For details, see [Docs Homepage & UI Components](/vtempest/GRAB-URL/5.2-docs-homepage-and-ui-components).
Sources: [docs/app/(home)/page.tsx5-29](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/app/(home)/page.tsx#L5-L29)[docs/app/layout.config.tsx9-27](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/app/layout.config.tsx#L9-L27)[docs/components/DocsHomepage/footer.tsx6-13](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/components/DocsHomepage/footer.tsx#L6-L13)

## Code Graph & Dependency Visualization

The site provides a C4-model visualization of the codebase. It uses a server action to parse file structures and generates Mermaid.js syntax for rendering interactive SVGs. The `source.tsx` file handles the content layer, using `pageTreeCodeTitles` to format function names like `grab()` or React components like `<Grab />` within the navigation tree [docs/lib/fumadocs/source.tsx21-38](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/lib/fumadocs/source.tsx#L21-L38)

### Dependency Graph Logic

For details, see [Code Graph & Dependency Visualization](/vtempest/GRAB-URL/5.3-code-graph-and-dependency-visualization).
Sources: [docs/package.json38](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/package.json#L38-L38)[docs/lib/fumadocs/source.tsx15-38](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/lib/fumadocs/source.tsx#L15-L38)

## Code-Tree & Badge Components

The site provides deep introspection into TypeScript types via specialized UI components. Components like `Badge` and `ColorizedSignature` provide syntax-highlighted tooltips for functions, classes, and types. The `Breadcrumb` component provides navigation context by mapping the current path to the FumaDocs page tree [docs/components/fumadocs/layout/breadcrumb.tsx9-36](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/components/fumadocs/layout/breadcrumb.tsx#L9-L36) The `source` loader in `source.tsx` integrates the `openapiPlugin` and `lucideIconsPlugin` to enrich the content tree [docs/lib/fumadocs/source.tsx15-19](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/lib/fumadocs/source.tsx#L15-L19)

For details, see [Code-Tree & Badge Components](/vtempest/GRAB-URL/5.4-code-tree-and-badge-components).
Sources: [docs/components/fumadocs/layout/breadcrumb.tsx9-36](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/components/fumadocs/layout/breadcrumb.tsx#L9-L36)[docs/package.json32-43](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/package.json#L32-L43)[docs/lib/fumadocs/source.tsx15-38](https://github.com/vtempest/GRAB-URL/blob/a61acaf0/docs/lib/fumadocs/source.tsx#L15-L38)