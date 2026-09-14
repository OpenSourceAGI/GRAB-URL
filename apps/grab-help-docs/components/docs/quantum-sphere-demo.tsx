'use client';

/**
 * @file quantum-sphere-demo.tsx
 * @description Live demos for the `quantum-sphere-loading-icon` package — the
 * parabolic orbital sphere that GRAB-URL ships alongside the flat SVG spinners.
 * Two entry points: {@link QuantumSpherePreview} for embedding in an MDX page,
 * and {@link QuantumSphereStudio}, the full control panel behind
 * `/loaders/quantum-sphere`, where every slider writes into the `config` prop
 * and the resulting code is shown ready to copy.
 */

import { useEffect, useId, useMemo, useState } from 'react';
import { Check, Copy, Dices, RotateCcw } from 'lucide-react';
import QuantumOrbital from 'quantum-sphere-loading-icon/react';
import type { OrbitalSphereConfig } from 'quantum-sphere-loading-icon/types';
import { cn } from '@/lib/utils';

/**
 * The knobs the studio exposes. Each one pins a single value that the demo
 * expands into the matching `min*`/`max*` pair, because the component draws
 * every dimension from a range — collapsing the range to a point is what turns
 * a randomizer into a picker.
 */
interface SphereSettings {
  lines: number;
  sphereSize: number;
  lineWidth: number;
  glowIntensity: number;
  rotationSpeed: number;
  saturation: number;
  lightness: number;
  opacity: number;
}

const DEFAULT_SETTINGS: SphereSettings = {
  lines: 9,
  sphereSize: 180,
  lineWidth: 1.2,
  glowIntensity: 10,
  rotationSpeed: 8,
  saturation: 85,
  lightness: 60,
  opacity: 0.75,
};

/** Expands the flat slider values into the component's range-shaped config. */
function toConfig(settings: SphereSettings): OrbitalSphereConfig {
  return {
    minLines: settings.lines,
    maxLines: settings.lines,
    minSphereSize: settings.sphereSize,
    maxSphereSize: settings.sphereSize,
    minLineWidth: settings.lineWidth,
    maxLineWidth: settings.lineWidth,
    minGlowIntensity: settings.glowIntensity,
    maxGlowIntensity: settings.glowIntensity,
    minRotationSpeed: settings.rotationSpeed,
    maxRotationSpeed: settings.rotationSpeed,
    minSaturation: settings.saturation,
    maxSaturation: settings.saturation,
    minLightness: settings.lightness,
    maxLightness: settings.lightness,
    autoRandomizeMin: 5000,
    autoRandomizeMax: 12000,
    opacity: settings.opacity,
  };
}

/** Renders the `config` object exactly as it would be written by hand. */
function toCode(settings: SphereSettings, autoRandomize: boolean): string {
  const config = toConfig(settings);
  const body = Object.entries(config)
    .map(([key, value]) => `    ${key}: ${value},`)
    .join('\n');

  return [
    `import QuantumOrbital from 'quantum-sphere-loading-icon/react';`,
    '',
    '<QuantumOrbital',
    '  config={{',
    body,
    '  }}',
    `  autoRandomize={${autoRandomize}}`,
    '/>',
  ].join('\n');
}

/**
 * Mount gate. The sphere seeds its RNG from `Date.now()`, so a server render
 * and the client render disagree by construction. Holding the first paint
 * until after mount keeps hydration quiet; the placeholder reserves the final
 * height so nothing below it jumps.
 */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (next: number) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-baseline justify-between gap-2 text-fd-muted-foreground">
        {label}
        <span className="font-mono text-xs tabular-nums text-fd-foreground">
          {value}
          {unit}
        </span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer accent-fd-primary"
      />
    </label>
  );
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1.5 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-emerald-500" /> Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" /> Copy config
        </>
      )}
    </button>
  );
}

/**
 * Compact embed for the Loading Animations docs page: the sphere at its default
 * settings, plus a button that re-rolls it so the randomization is visible
 * without waiting out the 5–12s timer.
 */
export function QuantumSpherePreview({ size = 180 }: { size?: number }) {
  const mounted = useMounted();
  const [seed, setSeed] = useState(0);

  const config = useMemo(
    () => toConfig({ ...DEFAULT_SETTINGS, sphereSize: size }),
    [size],
  );

  return (
    <div className="not-prose my-6 flex flex-col items-center gap-3 rounded-lg border border-fd-border bg-fd-card p-6">
      <div
        className="flex items-center justify-center"
        style={{ minHeight: size + 40 }}
      >
        {mounted ? (
          <QuantumOrbital key={seed} config={config} autoRandomize />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setSeed((value) => value + 1)}
          className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1.5 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
        >
          <Dices className="size-3.5" /> Re-roll
        </button>
        <a
          href="/loaders/quantum-sphere"
          className="inline-flex items-center gap-1.5 rounded-md bg-fd-primary px-2.5 py-1.5 text-xs font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
        >
          Open the full demo
        </a>
      </div>
      <p className="text-center text-xs text-fd-muted-foreground">
        Hover a ring to collapse it — each line picks its own hue, glow and speed
        on contact.
      </p>
    </div>
  );
}

/**
 * The full playground rendered at `/loaders/quantum-sphere`: every configurable
 * dimension on a slider, live re-render on change, and the exact `config` that
 * produces what is on screen.
 */
export function QuantumSphereStudio() {
  const mounted = useMounted();
  const [settings, setSettings] = useState<SphereSettings>(DEFAULT_SETTINGS);
  const [autoRandomize, setAutoRandomize] = useState(true);
  const [seed, setSeed] = useState(0);
  const autoId = useId();

  const config = useMemo(() => toConfig(settings), [settings]);
  const code = useMemo(() => toCode(settings, autoRandomize), [settings, autoRandomize]);

  /**
   * The sphere generates its lines once on mount and then only on its own
   * timer, so a settings change has to remount it to be visible. Keying on the
   * serialized config does exactly that, and the extra `seed` lets "Re-roll"
   * force a fresh colour scheme without changing any slider.
   */
  const instanceKey = `${JSON.stringify(settings)}:${autoRandomize}:${seed}`;

  const update = <K extends keyof SphereSettings>(key: K) =>
    (value: SphereSettings[K]) =>
      setSettings((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-h-[420px] min-w-0 items-center justify-center overflow-hidden rounded-xl border border-fd-border bg-fd-card">
        {mounted ? (
          <QuantumOrbital
            key={instanceKey}
            config={config}
            autoRandomize={autoRandomize}
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-fd-border bg-fd-card p-5">
        <Slider label="Lines" value={settings.lines} min={3} max={24} onChange={update('lines')} />
        <Slider
          label="Sphere size"
          value={settings.sphereSize}
          min={60}
          max={320}
          step={10}
          unit="px"
          onChange={update('sphereSize')}
        />
        <Slider
          label="Line width"
          value={settings.lineWidth}
          min={0.4}
          max={4}
          step={0.2}
          unit="px"
          onChange={update('lineWidth')}
        />
        <Slider
          label="Glow"
          value={settings.glowIntensity}
          min={0}
          max={40}
          onChange={update('glowIntensity')}
        />
        <Slider
          label="Rotation"
          value={settings.rotationSpeed}
          min={1}
          max={30}
          unit="s"
          onChange={update('rotationSpeed')}
        />
        <Slider
          label="Saturation"
          value={settings.saturation}
          min={0}
          max={100}
          unit="%"
          onChange={update('saturation')}
        />
        <Slider
          label="Lightness"
          value={settings.lightness}
          min={20}
          max={90}
          unit="%"
          onChange={update('lightness')}
        />
        <Slider
          label="Opacity"
          value={settings.opacity}
          min={0.1}
          max={1}
          step={0.05}
          onChange={update('opacity')}
        />

        <label
          htmlFor={autoId}
          className="flex items-center gap-2 text-sm text-fd-muted-foreground"
        >
          <input
            id={autoId}
            type="checkbox"
            checked={autoRandomize}
            onChange={(event) => setAutoRandomize(event.target.checked)}
            className="size-3.5 accent-fd-primary"
          />
          Auto-randomize colour scheme
        </label>

        <div className="flex flex-wrap gap-2 border-t border-fd-border pt-4">
          <button
            type="button"
            onClick={() => setSeed((value) => value + 1)}
            className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1.5 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
          >
            <Dices className="size-3.5" /> Re-roll
          </button>
          <button
            type="button"
            onClick={() => setSettings(DEFAULT_SETTINGS)}
            className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1.5 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
          <CopyButton code={code} />
        </div>
      </div>

      <div className="min-w-0 lg:col-span-2">
        <pre className="overflow-x-auto rounded-xl border border-fd-border bg-fd-secondary/40 p-4 text-xs leading-relaxed">
          <code className={cn('font-mono')}>{code}</code>
        </pre>
      </div>
    </div>
  );
}
