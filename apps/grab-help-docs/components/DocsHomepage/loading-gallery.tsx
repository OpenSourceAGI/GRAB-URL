'use client';

/**
 * @file loading-gallery.tsx
 * @description Homepage gallery of every loading animation in the repo — SVG spinners,
 * React `<Spinner>` variants, terminal spinners and the 294 single-div CSS drawings —
 * in one scrollable grid with search and category filters. Terminal spinners only tick
 * and single-div drawings only load their stylesheet while on screen.
 */

import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import * as loadingSvgs from 'loading-animations/svg/src';
import * as cliSpinners from 'loading-animations';
import { SINGLEDIV_2014_2019_IDS, SINGLEDIV_IDS, showRandomSingleDiv } from 'loading-animations/singlediv/src';
import { SPINNER_VARIANTS, Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type Kind = 'svg' | 'react' | 'cli' | 'singlediv';

type Item = { kind: Kind; name: string; code: string; frames?: string[] };

const KIND_LABELS: Record<Kind, string> = {
  svg: 'SVG',
  react: 'React Spinner',
  cli: 'Terminal',
  singlediv: 'Single Div CSS',
};

type LoadingSvg = (options: { size?: number }) => string;
const SVGS = loadingSvgs as unknown as Record<string, LoadingSvg>;

/** Splits a terminal spinner into frames: a string is 1 char per frame, a tuple is `[data, n]`. */
const toFrames = (spinner: unknown): string[] => {
  const [data, n] = Array.isArray(spinner) ? spinner : [spinner, 1];
  return typeof data === 'string' ? (data.match(new RegExp(`.{1,${n}}`, 'gsu')) ?? []) : [];
};

const OLD_SINGLEDIV = new Set(SINGLEDIV_2014_2019_IDS);

const ITEMS: Item[] = [
  ...Object.keys(SVGS)
    .filter((name) => name.startsWith('loading'))
    .sort()
    .map((name) => ({
      kind: 'svg' as const,
      name,
      code: `import { ${name} } from "loading-animations/svg";\nel.innerHTML = ${name}({ size: 64 });`,
    })),
  ...SPINNER_VARIANTS.map((variant) => ({
    kind: 'react' as const,
    name: variant,
    code: `<Spinner variant="${variant}" />`,
  })),
  ...Object.entries(cliSpinners as Record<string, unknown>)
    .map(([name, spinner]) => ({
      kind: 'cli' as const,
      name,
      frames: toFrames(spinner),
      code: `import { ${name} } from "loading-animations";`,
    }))
    .filter((item) => item.frames.length > 1),
  ...SINGLEDIV_IDS.map((id) => ({
    kind: 'singlediv' as const,
    name: id,
    code: `import { showRandomSingleDiv } from "loading-animations/singlediv";\nshowRandomSingleDiv("#loader", { id: "${id}" });`,
  })),
];

const COUNTS = ITEMS.reduce(
  (counts, item) => ({ ...counts, [item.kind]: counts[item.kind] + 1 }),
  { svg: 0, react: 0, cli: 0, singlediv: 0 } as Record<Kind, number>,
);

/** True while the element is within (or near) the viewport. */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '100px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, inView] as const;
}

function SvgPreview({ name }: { name: string }) {
  return (
    <div
      className="size-16 text-foreground [&>svg]:size-full"
      dangerouslySetInnerHTML={{ __html: SVGS[name]({ size: 64 }) }}
    />
  );
}

function CliPreview({ frames }: { frames: string[] }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % frames.length), 100);
    return () => clearInterval(timer);
  }, [inView, frames.length]);
  return (
    <div
      ref={ref}
      className="w-full truncate rounded-md bg-zinc-900 px-2 py-3 text-center font-mono text-xl whitespace-pre text-emerald-400"
    >
      {frames[frame]}
    </div>
  );
}

function SingleDivPreview({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const handle = showRandomSingleDiv(ref.current, { id, height: 400, scale: 0.35 });
    return handle.remove;
  }, [id]);
  return <div ref={ref} className="w-full overflow-hidden rounded-md" />;
}

function GalleryCard({ item }: { item: Item }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(item.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy: ${item.code}`}
      className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary"
    >
      <div className="flex h-[140px] w-full items-center justify-center">
        {item.kind === 'svg' && <SvgPreview name={item.name} />}
        {item.kind === 'react' && <Spinner variant={item.name as (typeof SPINNER_VARIANTS)[number]} size={48} />}
        {item.kind === 'cli' && <CliPreview frames={item.frames!} />}
        {item.kind === 'singlediv' && <SingleDivPreview id={item.name} />}
      </div>
      <div className="flex w-full items-center justify-between gap-2 text-xs">
        <span className="truncate font-mono">{item.name}</span>
        <span className="shrink-0 text-muted-foreground">
          {copied ? (
            <Check className="size-3.5 text-emerald-500" />
          ) : item.kind === 'singlediv' ? (
            OLD_SINGLEDIV.has(item.name) ? '2014–19' : 'CSS'
          ) : (
            KIND_LABELS[item.kind]
          )}
        </span>
      </div>
    </button>
  );
}

export function LoadingGallery() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const visible = ITEMS.filter(
    (item) =>
      (kind === 'all' || item.kind === kind) &&
      (!deferredQuery || item.name.toLowerCase().includes(deferredQuery)),
  );

  const filters: [Kind | 'all', string, number][] = [
    ['all', 'All', ITEMS.length],
    ...(Object.keys(KIND_LABELS) as Kind[]).map((k) => [k, KIND_LABELS[k], COUNTS[k]] as [Kind, string, number]),
  ];

  return (
    <section className="py-20 md:py-32 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{ITEMS.length} Loading Animations</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every loader in <code className="font-mono">loading-animations</code>: {COUNTS.svg} SVG spinners,{' '}
            {COUNTS.react} React variants, {COUNTS.cli} terminal spinners and {COUNTS.singlediv} single-div CSS
            drawings from{' '}
            <a href="https://a.singlediv.com" className="underline" target="_blank" rel="noreferrer">
              a.singlediv.com
            </a>
            . Click any one to copy its code.
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${ITEMS.length} animations…`}
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  kind === value
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {label} <span className="opacity-60">{count}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="mb-3 text-sm text-muted-foreground">
          Showing {visible.length} of {ITEMS.length}
        </p>

        <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-border p-3">
          {visible.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {visible.map((item) => (
                <GalleryCard key={`${item.kind}:${item.name}`} item={item} />
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-muted-foreground">No animations match “{query}”.</p>
          )}
        </div>
      </div>
    </section>
  );
}
