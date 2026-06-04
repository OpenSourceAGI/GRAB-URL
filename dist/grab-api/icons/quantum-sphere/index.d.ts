/**
 * @module quantum-sphere
 * Quantum orbital sphere animated loading component.
 *
 * Inspired by quantum superposition of atomic orbitals and the
 * [wave function collapse](https://en.wikipedia.org/wiki/Wave_function_collapse).
 *
 * React usage:
 * ```tsx
 * import QuantumOrbital from "@grab-url/grab-api/icons/quantum-sphere";
 * <QuantumOrbital />
 * ```
 *
 * Vanilla JS usage (framework-agnostic):
 * ```ts
 * import { createRandom, generateSphereConfig } from "@grab-url/grab-api/icons/quantum-sphere";
 * const rng = createRandom();
 * const sphere = generateSphereConfig(DEFAULT_ORBITAL_SPHERE_CONFIG, rng);
 * ```
 *
 * @author [vtempest](https://github.com/vtempest)
 */
export { default as QuantumOrbital } from '../../../quantum-sphere-loading-animation/src/react/QuantumOrbital';
export { default } from '../../../quantum-sphere-loading-animation/src/react/QuantumOrbital';
export { useRandom } from '../../../quantum-sphere-loading-animation/src/react/useRandom';
export { useSphereConfig } from '../../../quantum-sphere-loading-animation/src/react/useSphereConfig';
export { createRandom } from '../../../quantum-sphere-loading-animation/src/shared/random';
export { generateSphereConfig } from '../../../quantum-sphere-loading-animation/src/shared/generateSphereConfig';
export { getLineStyle } from '../../../quantum-sphere-loading-animation/src/shared/getLineStyle';
export { createColorSchemes } from '../../../quantum-sphere-loading-animation/src/shared/colorSchemes';
export { DEFAULT_ORBITAL_SPHERE_CONFIG } from '../../../quantum-sphere-loading-animation/src/shared/defaults';
export type * from '../../../quantum-sphere-loading-animation/src/types/QuantumOrbital';
export type { RandomUtils } from '../../../quantum-sphere-loading-animation/src/shared/random';
export type { ColorSchemeMap, ColorSchemeFunction } from '../../../quantum-sphere-loading-animation/src/shared/colorSchemes';
export type { GenerateSphereConfig } from '../../../quantum-sphere-loading-animation/src/react/useSphereConfig';
