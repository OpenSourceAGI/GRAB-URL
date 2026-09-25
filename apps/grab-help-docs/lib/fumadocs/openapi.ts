/**
 * @file openapi.ts
 * @description Server-side OpenAPI instance used to load and bundle the schema.
 */
import { createOpenAPI } from 'fumadocs-openapi/server';
import { docsConfig } from '@/lib/fumadocs/customize-docs';

// Server-only: `createOpenAPIPage()` builds a client component and cannot be
// handed this instance, so the two halves live in separate modules.
export const openapi = createOpenAPI({
  // the OpenAPI schema, you can also give it an external URL.
  input: [docsConfig.apiDocsPath].filter(Boolean) as string[],
});
