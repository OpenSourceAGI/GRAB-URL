/**
 * @module icons
 * Quantum orbital sphere animated loading component.
 *
 * Inspired by quantum superposition of atomic orbitals and the
 * [wave function collapse](https://en.wikipedia.org/wiki/Wave_function_collapse).
 *
 * React usage:
 * ```tsx
 * import QuantumOrbital from "quantum-sphere-loading-icon/icons";
 * <QuantumOrbital />
 * ```
 *
 * Vanilla JS usage (framework-agnostic):
 * ```ts
 * import { createRandom, generateSphereConfig, DEFAULT_ORBITAL_SPHERE_CONFIG } from "quantum-sphere-loading-icon/icons";
 * const rng = createRandom();
 * const sphere = generateSphereConfig(DEFAULT_ORBITAL_SPHERE_CONFIG, rng);
 * ```
 *
 * @author [vtempest](https://github.com/vtempest)
 */

// React component
export { default as QuantumOrbital } from "./react/QuantumOrbital";
export { default } from "./react/QuantumOrbital";

// React hooks
export { useRandom } from "./react/useRandom";
export { useSphereConfig } from "./react/useSphereConfig";

// Framework-agnostic core
export { createRandom } from "./shared/random";
export { generateSphereConfig } from "./shared/generateSphereConfig";
export { getLineStyle } from "./shared/getLineStyle";
export { createColorSchemes } from "./shared/colorSchemes";
export { DEFAULT_ORBITAL_SPHERE_CONFIG } from "./shared/defaults";

// Types
export type * from "./types/QuantumOrbital";
export type { RandomUtils } from "./shared/random";
export type { ColorSchemeMap, ColorSchemeFunction } from "./shared/colorSchemes";
export type { GenerateSphereConfig } from "./react/useSphereConfig";
