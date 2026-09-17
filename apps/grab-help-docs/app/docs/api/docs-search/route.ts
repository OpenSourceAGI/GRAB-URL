/**
 * @file route.ts
 * @description API route serving the static documentation search index.
 */
import { source } from '@/lib/fumadocs/source';
import { createFromSource } from 'fumadocs-core/search/server';

// it should be cached forever
export const revalidate = false;

export const { staticGET: GET } = createFromSource(source);