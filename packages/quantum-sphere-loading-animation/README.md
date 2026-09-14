<p align="center">
    <img width="350px" src="https://i.imgur.com/wySaMJl.png" />
</p>

<h3 align="center">
   <a href="https://grab.js.org">📑 Docs</a>
  <a href="https://grab.js.org/docs/examples">🎯 Examples</a>
</h3>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://grab.js.org"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/GRAB-URL/tree/master/packages/quantum-sphere-loading-animation"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/quantum-sphere-loading-icon"><img src="https://img.shields.io/npm/dm/quantum-sphere-loading-icon.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/quantum-sphere-loading-icon"><img src="https://img.shields.io/npm/v/quantum-sphere-loading-icon.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/quantum-sphere-loading-icon"><img src="https://img.shields.io/npm/dt/quantum-sphere-loading-icon.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/quantum-sphere-loading-icon"><img src="https://img.shields.io/npm/types/quantum-sphere-loading-icon" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=quantum-sphere-loading-icon"><img src="https://packagephobia.com/badge?p=quantum-sphere-loading-icon" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/GRAB-URL" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/GRAB-URL?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/GRAB-URL?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/GRAB-URL?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/GRAB-URL" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/GRAB-URL.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" alt="npm" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Svelte-FF3E00?logo=svelte&logoColor=white" alt="Svelte" />
</p>
<!-- template-git-repo:badges:end -->

# Quantum Sphere Loading

https://github.com/user-attachments/assets/903f2483-6fac-4592-be09-5fdc17196a84

## [DEMO](https://grab.js.org/loaders/quantum-sphere)

Tune every setting live and copy the matching `config` at
[grab.js.org/loaders/quantum-sphere](https://grab.js.org/loaders/quantum-sphere).

A parabolic spherical orbital loading component, inspired by [quantum superposition of atomic orbitals](https://www.thoughtco.com/definition-of-molecular-orbital-605367) and the wave function collapse concept. Particles occupy multiple quantum states until interacting (hovering), creating a mesmerizing, high-performance UI element.

Available for both **React** and **Svelte 5**.

## Features

- ⚛️ **Physics-based Animation**: Lines rotate in 3D space with parabolic trajectories
- 🎨 **Dynamic Color Schemes**: 20+ preset color schemes (Neon, Cyberpunk, Galaxy, etc.)
- 🖱️ **Interactive**: Hover effects simulate wave function collapse (particles react to observation)
- ⚙️ **Highly Configurable**: Control line count, sphere size, speed, glow, and more
- 🎭 **Dual Framework Support**: First-class support for both React and Svelte 5

## Installation

```
bun i quantum-sphere-loading-icon
```

It also ships inside [`grab-url`](https://grab.js.org), so a project that already
depends on that can skip the install and import from `grab-url/icons/quantum-sphere`.

## Usage

### React

```tsx
import React from "react";
import QuantumWaveOrbital from "quantum-sphere-loading-icon";

function App() {
  return (
    <div style={{ height: "500px", width: "100%" }}>
      <QuantumWaveOrbital
        autoRandomize={true}
        onSphereClick={() => console.log("Sphere clicked")}
        className="my-custom-class"
      />
    </div>
  );
}
```

### Svelte (v5)

```svelte
<script>
  import QuantumWaveOrbital from 'quantum-sphere-loading-icon/svelte';
</script>

<div class="container">
  <QuantumWaveOrbital
    autoRandomize={true}
    onSphereClick={() => console.log('Sphere clicked')}
  />
</div>

<style>
  .container {
    height: 500px;
    width: 100%;
  }
</style>
```

## Configuration

You can customize the sphere by passing a `config` prop/prop.

```tsx
// Example custom config
const myConfig = {
  minLines: 8,
  maxLines: 16,
  minSphereSize: 150,
  maxSphereSize: 200,
  minRotationSpeed: 5,
  maxRotationSpeed: 20,
  // ... see types for full list
};

<QuantumWaveOrbital config={myConfig} />;
```

### Props / API

| Prop            | Type                  | Default          | Description                                                           |
| --------------- | --------------------- | ---------------- | --------------------------------------------------------------------- |
| `config`        | `OrbitalSphereConfig` | (Default Preset) | detailed configuration object                                         |
| `autoRandomize` | `boolean`             | `true`           | Periodically changes the sphere's configuration (colors, lines, size) |
| `className`     | `string`              | `""`             | Additional CSS classes for the container                              |
| `onSphereClick` | `() => void`          | `null`           | Callback when the sphere is clicked                                   |

### OrbitalSphereConfig Interface

See `src/QuantumSphere.d.ts` (or your IDE's autocomplete) for the full list of configuration options, including:

- `minLines` / `maxLines`
- `minSphereSize` / `maxSphereSize`
- `minGlowIntensity` / `maxGlowIntensity`
- `minSaturation` / `maxSaturation`
- `autoRandomizeMin` / `autoRandomizeMax` (ms)

## License

MIT © [vtempest](https://github.com/vtempest)
