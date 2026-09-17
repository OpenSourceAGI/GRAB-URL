/**
 * @file api-page.tsx
 * @description API page component that generates dynamic documentation and code samples.
 */
'use client';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';

// `createOpenAPIPage()` returns a client component and must be called from a
// client module. The schema reaches it through the `payload`/`preloaded` props
// that the page data supplies, so the server instance
// (`@/lib/fumadocs/openapi`) is no longer passed in here.
export const APIPage = createOpenAPIPage({
    generateCodeSamples() {
        return [
            // {
            //     id: 'js',
            //     lang: 'js',
            //     label: 'JavaScript SDK',
            //     source: "console.log('hello')",
            // },
            // or to disable the default code samples
            // set `source: false`
            {
                id: 'curl',
                lang: 'bash',
                source: false,
            },
        ];
    },
});
