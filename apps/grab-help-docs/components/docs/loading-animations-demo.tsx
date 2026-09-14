'use client';

/**
 * @file loading-animations-demo.tsx
 * @description Live gallery for every loading icon shipped by the repo — the eight
 * `<Spinner>` React variants from `@/components/ui/spinner` and all 25 SVG-string
 * animations from the `loading-animations` package. Size and color are wired to
 * controls so the page doubles as a picker: whatever you dial in is the exact code
 * shown under each animation.
 */

import { useId, useState } from 'react';
import { Check, Copy, Plus, X } from 'lucide-react';
import * as loadingSvgs from 'loading-animations/svg/src';
import { SPINNER_VARIANTS, Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/** `colors` accepts one hex per color in the source SVG; monochrome icons need just one. */
type LoadingSvg = (options: {
  colors?: string[];
  size?: number;
  raw?: boolean;
}) => string;

/**
 * The eight monochrome SVGs that mirror the React `<Spinner>` variants one-for-one.
 * Listed separately so the gallery can call them out from the older multi-color set.
 */
const MONOCHROME_EXPORTS = [
  'loadingSpokes',
  'loadingCircleNotch',
  'loadingPinwheel',
  'loadingCircleTrack',
  'loadingDotsBounce',
  'loadingPulseRing',
  'loadingEqualizerBars',
  'loadingInfiniteDash',
] as const;

const SVG_ENTRIES = Object.entries(loadingSvgs as Record<string, LoadingSvg>)
  .filter(([name]) => name.startsWith('loading'))
  .sort(([a], [b]) => {
    const aNew = (MONOCHROME_EXPORTS as readonly string[]).includes(a);
    const bNew = (MONOCHROME_EXPORTS as readonly string[]).includes(b);
    if (aNew !== bNew) return aNew ? -1 : 1;
    return a.localeCompare(b);
  });

const TEXT_COLORS = [
  { label: 'Current', className: '', swatch: 'currentColor' },
  { label: 'Primary', className: 'text-fd-primary', swatch: 'var(--color-fd-primary)' },
  { label: 'Muted', className: 'text-fd-muted-foreground', swatch: 'var(--color-fd-muted-foreground)' },
  { label: 'Emerald', className: 'text-emerald-500', swatch: '#10b981' },
  { label: 'Rose', className: 'text-rose-500', swatch: '#f43f5e' },
] as const;

/**
 * Ready-made palettes for the SVG gallery. `colors` is handed straight to the
 * animation functions, which substitute entries into the SVG in source order —
 * so a theme with three colors restyles the first three colors of every icon and
 * leaves the rest of a busier icon (`loadingSquareBlocks` has 32) untouched.
 */
const COLOR_THEMES = [
  { label: 'Zinc', colors: ['#71717a'] },
  { label: 'Ocean', colors: ['#0099e5', '#38bdf8', '#a5f3fc'] },
  { label: 'Sunset', colors: ['#f97316', '#f43f5e', '#facc15'] },
  { label: 'Forest', colors: ['#059669', '#34d399', '#a3e635'] },
  { label: 'Grape', colors: ['#7c3aed', '#a855f7', '#ec4899'] },
  { label: 'Slate', colors: ['#334155', '#64748b', '#94a3b8'] },
  { label: 'Candy', colors: ['#ff4c4c', '#ffb703', '#06d6a0'] },
  { label: 'Neon', colors: ['#00f5d4', '#f15bb5', '#fee440'] },
] as const;

/** Cycled through when "Add color" appends a swatch, so each new one is visibly different. */
const NEXT_COLOR_CYCLE = [
  '#0099e5',
  '#ff4c4c',
  '#10b981',
  '#f59e0b',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#eab308',
];

/** Ceiling on the swatch list — past this the row stops being readable. */
const MAX_COLORS = 12;

/** Click-to-copy label used under every animation in the gallery. */
function CopyableCode({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      title={code}
      aria-label={`Copy code for ${label}`}
      onClick={() => {
        void navigator.clipboard.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="group flex max-w-full items-center justify-center gap-1.5 rounded px-1.5 py-0.5 text-center font-mono text-xs leading-tight text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
    >
      <span className="break-all">{label}</span>
      {copied ? (
        <Check className="size-3 shrink-0 text-emerald-500" />
      ) : (
        <Copy className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

function Cell({
  children,
  code,
  label,
  badge,
}: {
  children: React.ReactNode;
  code: string;
  label: string;
  badge?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-between gap-3 rounded-lg border border-fd-border bg-fd-card p-4">
      {badge ? (
        <span className="absolute top-1.5 right-1.5 rounded-full bg-fd-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-fd-primary">
          {badge}
        </span>
      ) : null}
      <div className="flex min-h-[88px] w-full items-center justify-center">
        {children}
      </div>
      <CopyableCode code={code} label={label} />
    </div>
  );
}

function SizeControl({
  value,
  onChange,
  min = 16,
  max = 96,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-fd-muted-foreground">
      Size
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={4}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-32 cursor-pointer accent-fd-primary"
      />
      <span className="w-10 font-mono text-xs tabular-nums">{value}px</span>
    </label>
  );
}

/** Renders a theme's colors as a single strip, so the chip previews the palette. */
function ThemeSwatch({ colors }: { colors: readonly string[] }) {
  return (
    <span className="flex size-4 shrink-0 overflow-hidden rounded-full border border-fd-border">
      {colors.map((themeColor) => (
        <span key={themeColor} className="flex-1" style={{ backgroundColor: themeColor }} />
      ))}
    </span>
  );
}

/** One editable swatch in the color list: pick a hex, or drop it from the palette. */
function ColorSwatch({
  color,
  index,
  onChange,
  onRemove,
}: {
  color: string;
  index: number;
  onChange: (next: string) => void;
  onRemove?: () => void;
}) {
  const id = useId();

  return (
    <span className="flex items-center gap-1.5 rounded-full border border-fd-border bg-fd-card py-0.5 pr-1 pl-1.5">
      <label htmlFor={id} className="sr-only">
        {`Color ${index + 1}`}
      </label>
      <input
        id={id}
        type="color"
        value={color}
        onChange={(event) => onChange(event.target.value)}
        className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <span className="font-mono text-xs uppercase">{color}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove color ${index + 1}`}
          className="rounded-full p-0.5 text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
        >
          <X className="size-3" />
        </button>
      ) : (
        // Keeps single-color and multi-color pills the same width so the row doesn't jump.
        <span className="size-4" aria-hidden="true" />
      )}
    </span>
  );
}

/** The eight `<Spinner variant>` values, colored with Tailwind text utilities. */
export function SpinnerVariants() {
  const [size, setSize] = useState(32);
  const [colorIndex, setColorIndex] = useState(0);
  const color = TEXT_COLORS[colorIndex] ?? TEXT_COLORS[0];

  return (
    <div className="not-prose my-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <SizeControl value={size} onChange={setSize} />
        <div className="flex items-center gap-2 text-sm text-fd-muted-foreground">
          Color
          <div className="flex items-center gap-1">
            {TEXT_COLORS.map((option, index) => (
              <button
                key={option.label}
                type="button"
                title={option.className || 'inherit'}
                aria-label={option.label}
                aria-pressed={index === colorIndex}
                onClick={() => setColorIndex(index)}
                className={cn(
                  'size-5 rounded-full border-2 transition-transform',
                  index === colorIndex
                    ? 'border-fd-foreground scale-110'
                    : 'border-transparent hover:scale-110',
                )}
                style={{ backgroundColor: option.swatch }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SPINNER_VARIANTS.map((variant) => (
          <Cell
            key={variant}
            label={variant}
            code={`<Spinner variant="${variant}"${size === 24 ? '' : ` size={${size}}`}${
              color.className ? ` className="${color.className}"` : ''
            } />`}
          >
            <Spinner
              variant={variant}
              size={size}
              className={color.className || undefined}
            />
          </Cell>
        ))}
      </div>
    </div>
  );
}

/** Every SVG-string animation exported by `loading-animations/svg`. */
export function LoadingSvgGallery() {
  const [size, setSize] = useState(64);
  const [colors, setColors] = useState<string[]>(['#71717a']);
  const [recolor, setRecolor] = useState(false);
  const recolorId = useId();

  /** The theme whose palette is currently loaded, so its chip can read as selected. */
  const activeTheme = COLOR_THEMES.find(
    (theme) =>
      theme.colors.length === colors.length &&
      theme.colors.every((themeColor, index) => themeColor === colors[index]),
  );

  const applyTheme = (themeColors: readonly string[]) => {
    setColors([...themeColors]);
    setRecolor(true);
  };

  const addColor = () => {
    setColors((current) => {
      if (current.length >= MAX_COLORS) return current;
      const next =
        NEXT_COLOR_CYCLE.find((candidate) => !current.includes(candidate)) ??
        NEXT_COLOR_CYCLE[current.length % NEXT_COLOR_CYCLE.length]!;
      return [...current, next];
    });
    setRecolor(true);
  };

  const setColorAt = (index: number, next: string) =>
    setColors((current) => current.map((color, i) => (i === index ? next : color)));

  const removeColorAt = (index: number) =>
    setColors((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : current,
    );

  const colorList = colors.map((color) => `'${color}'`).join(', ');

  return (
    <div className="not-prose my-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <SizeControl value={size} onChange={setSize} min={24} max={128} />
        <label htmlFor={recolorId} className="flex items-center gap-2 text-sm text-fd-muted-foreground">
          <input
            id={recolorId}
            type="checkbox"
            checked={recolor}
            onChange={(event) => setRecolor(event.target.checked)}
            className="size-3.5 accent-fd-primary"
          />
          Override colors
        </label>
      </div>

      <div
        className={cn(
          'flex flex-col gap-3 rounded-lg border border-fd-border bg-fd-card/50 p-3 transition-opacity',
          // Dimmed rather than disabled: the palette is still editable while
          // "Override colors" is off, and touching it turns the override on.
          !recolor && 'opacity-60',
        )}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-fd-muted-foreground">
          <span className="shrink-0">Theme</span>
          {COLOR_THEMES.map((theme) => (
            <button
              key={theme.label}
              type="button"
              aria-pressed={recolor && theme === activeTheme}
              onClick={() => applyTheme(theme.colors)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors',
                recolor && theme === activeTheme
                  ? 'border-fd-primary bg-fd-primary/10 text-fd-foreground'
                  : 'border-fd-border hover:bg-fd-muted hover:text-fd-foreground',
              )}
            >
              <ThemeSwatch colors={theme.colors} />
              {theme.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-fd-muted-foreground">
          <span className="shrink-0">Colors</span>
          {colors.map((color, index) => (
            <ColorSwatch
              // Index is the identity here: two swatches may hold the same hex, and
              // editing one must not re-key the other.
              key={index}
              color={color}
              index={index}
              onChange={(next) => setColorAt(index, next)}
              onRemove={colors.length > 1 ? () => removeColorAt(index) : undefined}
            />
          ))}
          <button
            type="button"
            onClick={addColor}
            disabled={colors.length >= MAX_COLORS}
            className="flex items-center gap-1 rounded-full border border-dashed border-fd-border px-2 py-1 text-xs transition-colors hover:bg-fd-muted hover:text-fd-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-3" />
            Add color
          </button>
        </div>

        <p className="text-xs text-fd-muted-foreground">
          {recolor
            ? 'Colors are substituted in source order, so extra entries only show on icons that use that many.'
            : 'Icons are drawing their built-in colors. Pick a theme or edit a swatch to apply this palette.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SVG_ENTRIES.map(([name, render]) => {
          const options = recolor ? { size, colors, raw: true } : { size, raw: true };
          const isMonochrome = (MONOCHROME_EXPORTS as readonly string[]).includes(name);

          return (
            <Cell
              key={name}
              label={name}
              badge={isMonochrome ? 'new' : undefined}
              code={`${name}({ size: ${size}${recolor ? `, colors: [${colorList}]` : ''} })`}
            >
              {/* `raw: true` returns the SVG markup itself (rather than an <img> data URI) so it
                  inlines into the page. The markup comes from this repo's own package, never user input. */}
              <div
                className="flex items-center justify-center"
                style={{ width: size, height: size }}
                dangerouslySetInnerHTML={{ __html: render(options) }}
              />
            </Cell>
          );
        })}
      </div>
    </div>
  );
}

/** Convenience wrapper rendering both galleries back to back. */
export function LoadingAnimationsDemo() {
  return (
    <>
      <SpinnerVariants />
      <LoadingSvgGallery />
    </>
  );
}
