/**
 * @file page.tsx
 * @description Standalone demo for the quantum sphere loader at
 * `/loaders/quantum-sphere`. Kept outside `/docs` so it can be linked and
 * shared on its own — the docs page embeds a preview and points here for the
 * full control panel.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Github } from 'lucide-react';
import { QuantumSphereStudio } from '@/components/docs/quantum-sphere-demo';

const REPO = 'https://github.com/vtempest/GRAB-URL/tree/master/packages/quantum-sphere-loading-animation';

export const metadata: Metadata = {
  title: 'Quantum Sphere Loader — GRAB-URL',
  description:
    'Live demo of quantum-sphere-loading-icon: a parabolic orbital loading animation for React and Svelte, with every line count, size, glow and rotation setting on a slider.',
  openGraph: {
    title: 'Quantum Sphere Loader — GRAB-URL',
    description:
      'A parabolic orbital loading animation for React and Svelte. Tune it live and copy the config.',
  },
};

/** Color schemes the sphere rotates through when `autoRandomize` is on. */
const COLOR_SCHEMES = [
  'Single', 'Dual', 'Rainbow', 'Random', 'Complementary', 'Triadic',
  'Analogous', 'Split', 'Tetradic', 'Monochromatic', 'Warm', 'Cool',
  'Neon', 'Sunset', 'Ocean', 'Forest', 'Galaxy', 'Fire', 'Ice',
  'Cyberpunk', 'Pastel', 'Vintage', 'Gradient', 'Electric',
];

export default function QuantumSpherePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/docs/loading-animations"
        className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
      >
        <ArrowLeft className="size-3.5" /> All loading animations
      </Link>

      <header className="mt-4 mb-8 flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Quantum Sphere Loader
        </h1>
        <p className="max-w-3xl text-fd-muted-foreground">
          A parabolic spherical orbital built from CSS-rotated rings, inspired by
          the quantum superposition of atomic orbitals. Every ring spins in its
          own 3D plane and holds a superposed state until you observe it —
          hovering collapses that ring onto a fresh hue, glow and speed. Unlike
          the flat SVG spinners it is a React or Svelte component rather than a
          string, so it is the one loader here that reacts to the pointer.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <code className="rounded-md bg-fd-secondary px-2 py-1 font-mono text-xs">
            bun i quantum-sphere-loading-icon
          </code>
          <span className="text-fd-muted-foreground">
            or import it from <code className="font-mono text-xs">grab-url/icons/quantum-sphere</code>
          </span>
          <a
            href={REPO}
            className="inline-flex items-center gap-1.5 text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            <Github className="size-3.5" /> Source
          </a>
        </div>
      </header>

      <QuantumSphereStudio />

      <section className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-2">
        <div className="min-w-0">
          <h2 className="mb-3 text-xl font-semibold">React</h2>
          <pre className="overflow-x-auto rounded-xl border border-fd-border bg-fd-secondary/40 p-4 text-xs leading-relaxed">
            <code className="font-mono">{`// Bundled with grab-url:
import QuantumOrbital from 'grab-url/icons/quantum-sphere';
// Or standalone:
import QuantumOrbital from 'quantum-sphere-loading-icon/react';

export function Loading() {
  return (
    <div style={{ height: 400 }}>
      <QuantumOrbital autoRandomize />
    </div>
  );
}`}</code>
          </pre>
        </div>
        <div className="min-w-0">
          <h2 className="mb-3 text-xl font-semibold">Svelte 5</h2>
          <pre className="overflow-x-auto rounded-xl border border-fd-border bg-fd-secondary/40 p-4 text-xs leading-relaxed">
            <code className="font-mono">{`<script>
  import QuantumOrbital from 'quantum-sphere-loading-icon/svelte';
</script>

<div style="height: 400px">
  <QuantumOrbital autoRandomize={true} />
</div>`}</code>
          </pre>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold">Props</h2>
        <div className="overflow-x-auto">
          {/* Wide enough that the description column stays readable; the
              wrapper scrolls it horizontally on a phone rather than squeezing. */}
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-fd-muted-foreground">
              <tr className="border-b border-fd-border">
                <th className="py-2 pr-4 font-medium">Prop</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Default</th>
                <th className="py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {[
                ['config', 'OrbitalSphereConfig', 'preset', 'Min/max bounds for line count, size, glow, rotation, saturation and lightness. Set a min equal to its max to pin the value instead of randomizing it.'],
                ['autoRandomize', 'boolean', 'true', 'Re-rolls the color scheme and shifts hue every 5–12s.'],
                ['className', 'string', '""', 'Extra classes on the wrapper.'],
                ['onSphereClick', '() => void', 'null', 'Fired when the sphere is clicked.'],
              ].map(([prop, type, fallback, description]) => (
                <tr key={prop} className="border-b border-fd-border/60">
                  <td className="py-2 pr-4 font-mono text-xs">{prop}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-fd-muted-foreground">{type}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-fd-muted-foreground">{fallback}</td>
                  <td className="py-2 text-fd-muted-foreground">{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold">Color schemes</h2>
        <p className="mb-4 text-sm text-fd-muted-foreground">
          With <code className="font-mono text-xs">autoRandomize</code> on, the
          sphere picks a new scheme every few seconds. Each one is a function
          mapping a ring&apos;s index to a hue, so the whole set works from a
          single base hue.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_SCHEMES.map((scheme) => (
            <span
              key={scheme}
              className="rounded-full border border-fd-border px-2.5 py-1 font-mono text-xs text-fd-muted-foreground"
            >
              {scheme}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
