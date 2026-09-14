/**
 * @file stackblitz-example.tsx
 * @description MDX component that renders a runnable example card linking to
 * a GitHub-backed StackBlitz fork, per https://developer.stackblitz.com/guides/integration/open-from-github.
 */
import { ExternalLink, Play } from 'lucide-react';

type StackBlitzExampleProps = {
  /** Card heading. */
  title: string;
  /** Optional one-line description shown under the title. */
  description?: string;
  /** `owner/repo/tree/branch/path/to/example` — a GitHub directory StackBlitz can import. */
  github: string;
  /** File to focus once the fork opens, e.g. `src/App.tsx`. */
  openFile?: string;
};

export function StackBlitzExample({
  title,
  description,
  github,
  openFile,
}: StackBlitzExampleProps) {
  const params = new URLSearchParams({ title });
  if (openFile) params.set('file', openFile);

  // `/fork` starts each reader in their own editable copy rather than a shared project page.
  const href = `https://stackblitz.com/fork/github/${github}?${params.toString()}`;

  return (
    <section className="not-prose my-6 overflow-hidden rounded-xl border bg-fd-card">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-fd-muted-foreground">{description}</p>
          ) : null}
        </div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-fd-primary px-3 py-2 text-sm font-medium text-fd-primary-foreground hover:opacity-90"
        >
          <Play className="size-4" />
          Open in StackBlitz
          <ExternalLink className="size-3.5" />
        </a>
      </div>
      {openFile ? (
        <p className="m-0 bg-fd-secondary/30 px-4 py-2 text-xs text-fd-muted-foreground">
          Opens <code>{openFile}</code>
        </p>
      ) : null}
    </section>
  );
}
