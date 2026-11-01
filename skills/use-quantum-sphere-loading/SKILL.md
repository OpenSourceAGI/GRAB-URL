---
name: use-quantum-sphere-loading
version: 1.0.0
description: Add the 3D parabolic "quantum sphere" loading animation to a React or Svelte 5 app with `quantum-sphere-loading-icon`.
category: development
type: guidance
languages: [typescript]
frameworks: [react, svelte]
---

# Use `quantum-sphere-loading-icon`

```bash
npm i quantum-sphere-loading-icon     # or: bun i …
```

```tsx
import QuantumWaveOrbital from "quantum-sphere-loading-icon";           // React
<QuantumWaveOrbital autoRandomize config={{ minLines: 8, maxLines: 16 }} className="loader" />
```

```svelte
<script>import QuantumWaveOrbital from "quantum-sphere-loading-icon/svelte";</script>
<QuantumWaveOrbital autoRandomize />
```

- Props: `config` (`OrbitalSphereConfig`: line counts, sphere size, rotation speed, glow, colors), `autoRandomize`, `onSphereClick`, `className`.
- Give the parent an explicit height/width; the sphere fills it.
- Tune a config visually at https://grab.js.org/loaders/quantum-sphere and paste it in.
- Already using `grab-url`? Import from `grab-url/icons/quantum-sphere` instead of installing this.
