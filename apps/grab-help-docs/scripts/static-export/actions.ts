/**
 * @file actions.ts
 * @description Static-export stand-in for `app/actions.ts`.
 *
 * `analyzeRemoteRepository` is a Server Action: it downloads a repository ZIP
 * server-side because GitHub's archive endpoints send no CORS headers, so the
 * browser cannot fetch them directly. Static export has no server to run it on,
 * and Next refuses to build when a Server Action is reachable from a client
 * component -- so `scripts/build-static-pages.mjs` swaps this file in.
 *
 * It keeps the exact signature the real action has, and returns the same
 * `{ success: false, error }` shape the caller already renders, so the code
 * graph page still works for the repository it ships with; only the
 * "load a remote repo" box reports that it needs the full site.
 */
import type { FileInfo } from '@/components/fumadocs/codegraph/dependency-graph-shared';

export async function analyzeRemoteRepository(
  _url: string,
): Promise<{ success: boolean; files?: FileInfo[]; error?: string }> {
  return {
    error:
      'Analyzing a remote repository needs a server, which this static GitHub Pages ' +
      'build does not have. Use https://grab.js.org/docs/code-graph instead.',
    success: false,
  };
}
