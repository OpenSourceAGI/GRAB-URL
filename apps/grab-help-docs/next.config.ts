import { createMDX } from 'fumadocs-mdx/next';
import { resolve } from 'path';

// GitHub Pages serves a pre-rendered copy of these docs (.github/workflows/pages.yml).
// A static export cannot run middleware, Server Actions, dynamic route handlers or
// rewrites, so that workflow prunes the server-only files first
// (scripts/build-static-pages.mjs) and sets DOCS_STATIC_EXPORT=1.
//
// Every other build -- including the one behind https://grab.js.org -- leaves the flag
// unset and is completely unaffected by this file's static-export branch.
const staticExport = process.env.DOCS_STATIC_EXPORT === '1';

// Project Pages are served from https://<owner>.github.io/<repo>, so assets and links
// need that prefix. The workflow passes it through from actions/configure-pages. It is
// NEXT_PUBLIC_ because client code has to build the same prefix into its fetch() URLs,
// which `basePath` does not rewrite.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const withMDX = createMDX({
  // mdxOptions: {
  //   remarkImageOptions: {
  //     onError: "ignore", // or "hide"
  //   },
  // },
});

type MDXNextConfig = NonNullable<Parameters<typeof withMDX>[0]>;

export const config = {
  serverExternalPackages: ['typescript', 'fumadocs-typescript'],
  // `loading-animations/svg/src` and `quantum-sphere-loading-icon/react` both
  // resolve to TypeScript source in the workspace, so Next has to compile them
  // rather than treat them as prebuilt dependencies.
  transpilePackages: ['loading-animations', 'quantum-sphere-loading-icon'],
  // distDir: './dist',
  outputFileTracingRoot: resolve(import.meta.dirname, '..'),
  turbopack: {
    // Must match outputFileTracingRoot: both point at the monorepo root so
    // workspace packages are traced into the Vercel output bundle.
    root: resolve(import.meta.dirname, '..'),
  },
  // `rewrites` is a server feature; under static export the pre-rendered
  // /docs/llms.mdx/docs/* pages are still emitted and reachable directly.
  ...(staticExport
    ? {
        assetPrefix: basePath || undefined,
        basePath,
        output: 'export' as const,
      }
    : {
        async rewrites() {
          return [
            {
              source: '/docs/:path*.mdx',
              destination: '/docs/llms.mdx/docs/:path*',
            },
          ];
        },
      }),
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
    ],
    unoptimized: true,
  },
} satisfies MDXNextConfig;
export default withMDX(config);
