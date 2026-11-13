/**
 * @file quantum-sphere.test.ts
 * @description Unit tests for the framework-agnostic helpers behind QuantumOrbital.
 */

import { describe, it, expect } from "vitest";
import { createRandom } from "../../quantum-sphere-loading-animation/src/shared/random.ts";
import { createColorSchemes } from "../../quantum-sphere-loading-animation/src/shared/colorSchemes.ts";
import { generateSphereConfig } from "../../quantum-sphere-loading-animation/src/shared/generateSphereConfig.ts";
import { getLineStyle } from "../../quantum-sphere-loading-animation/src/shared/getLineStyle.ts";
import { DEFAULT_ORBITAL_SPHERE_CONFIG } from "../../quantum-sphere-loading-animation/src/shared/defaults.ts";

describe("createRandom", () => {
  it("is deterministic for a given seed", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect([a.random(), a.random(), a.random()]).toEqual([b.random(), b.random(), b.random()]);
  });

  it("differs across seeds", () => {
    expect(createRandom(1).random()).not.toBe(createRandom(2).random());
  });

  it("random() stays within [0, 1)", () => {
    const { random } = createRandom(7);
    for (let i = 0; i < 500; i++) {
      const v = random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("randomRange() stays within [min, max)", () => {
    const { randomRange } = createRandom(9);
    for (let i = 0; i < 500; i++) {
      const v = randomRange(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
    }
  });

  it("randomInt() is inclusive on both ends and integral", () => {
    const { randomInt } = createRandom(11);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = randomInt(1, 3);
      expect(Number.isInteger(v)).toBe(true);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it("uses a default seed when none is given", () => {
    const v = createRandom().random();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});

describe("createColorSchemes", () => {
  const rng = createRandom(123);
  const schemes = createColorSchemes(rng.random, rng.randomRange);
  const names = Object.keys(schemes);

  it("exposes every documented scheme", () => {
    expect(names).toHaveLength(24);
    expect(names).toEqual(expect.arrayContaining(["Single", "Rainbow", "Random", "Pastel", "Neon"]));
  });

  it("every scheme returns a finite number for a range of indices", () => {
    for (const name of names) {
      for (let i = 0; i < 12; i++) {
        const hue = (schemes as any)[name](i, 12, 200);
        expect(Number.isFinite(hue)).toBe(true);
      }
    }
  });

  it("deterministic schemes behave as documented", () => {
    expect(schemes.Single(3, 10, 77)).toBe(77);
    expect(schemes.Monochromatic(3, 10, 77)).toBe(77);
    expect(schemes.Dual(0, 10, 100)).toBe(100);
    expect(schemes.Dual(1, 10, 100)).toBe(280);
    expect(schemes.Complementary(1, 10, 300)).toBe(120);
    expect(schemes.Triadic(2, 10, 10)).toBe(250);
    expect(schemes.Analogous(13, 20, 0)).toBe(30);
    expect(schemes.Split(1, 10, 0)).toBe(150);
    expect(schemes.Split(2, 10, 200)).toBe(50);
    expect(schemes.Tetradic(3, 10, 0)).toBe(270);
    expect(schemes.Neon(1, 6, 0)).toBe(60);
    expect(schemes.Sunset(0, 5, 0)).toBe(15);
    expect(schemes.Ocean(1, 5, 0)).toBe(200);
    expect(schemes.Forest(2, 5, 0)).toBe(90);
    expect(schemes.Galaxy(1, 5, 0)).toBe(280);
    expect(schemes.Fire(4, 5, 0)).toBe(60);
    expect(schemes.Ice(0, 5, 0)).toBe(180);
    expect(schemes.Cyberpunk(3, 5, 0)).toBe(320);
    expect(schemes.Vintage(3, 5, 0)).toBe(200);
    expect(schemes.Electric(2, 5, 0)).toBe(180);
    expect(schemes.Gradient(5, 10, 350)).toBe(20);
    expect(schemes.Rainbow(5, 10, 0)).toBe(180);
  });

  it("stochastic schemes use the injected RNG", () => {
    const fixed = createColorSchemes(() => 0.5, (min, max) => min + 0.5 * (max - min));
    expect(fixed.Random(0, 1, 0)).toBe(180);
    expect(fixed.Pastel(0, 1, 0)).toBe(180);
    expect(fixed.Cool(0, 1, 0)).toBe(225);
    expect(fixed.Warm(0, 1, 0)).toBe(30);
    expect(fixed.Warm(1, 1, 0)).toBe(330);
  });
});

describe("generateSphereConfig", () => {
  it("is reproducible for a given seed", () => {
    const a = generateSphereConfig(DEFAULT_ORBITAL_SPHERE_CONFIG, createRandom(5));
    const b = generateSphereConfig(DEFAULT_ORBITAL_SPHERE_CONFIG, createRandom(5));
    expect(a).toEqual(b);
  });

  it("respects configured bounds across many seeds", () => {
    const cfg = DEFAULT_ORBITAL_SPHERE_CONFIG;
    for (let seed = 1; seed <= 200; seed++) {
      const s = generateSphereConfig(cfg, createRandom(seed));
      expect(s.lines.length).toBeGreaterThanOrEqual(cfg.minLines);
      expect(s.lines.length).toBeLessThanOrEqual(cfg.maxLines);
      expect(s.sphereSize).toBeGreaterThanOrEqual(cfg.minSphereSize);
      expect(s.sphereSize).toBeLessThanOrEqual(cfg.maxSphereSize);
      expect(s.lineWidth).toBeGreaterThanOrEqual(cfg.minLineWidth);
      expect(s.lineWidth).toBeLessThan(cfg.maxLineWidth);
      s.lines.forEach((l, i) => expect(l.id).toBe(i));
    }
  });

  it("applies scheme-specific saturation/lightness tweaks for every scheme", () => {
    const rng = createRandom(1);
    const schemes = createColorSchemes(rng.random, rng.randomRange);
    const cfg = DEFAULT_ORBITAL_SPHERE_CONFIG;
    const seen = new Set<string>();
    for (let seed = 1; seed <= 2000 && seen.size < 24; seed++) {
      const s = generateSphereConfig(cfg, createRandom(seed), schemes);
      seen.add(s.colorScheme);
      if (s.colorScheme === "Pastel") {
        expect(s.saturation).toBeGreaterThanOrEqual(30);
        expect(s.saturation).toBeLessThanOrEqual(50);
        expect(s.lightness).toBeGreaterThanOrEqual(70);
      } else if (s.colorScheme === "Neon" || s.colorScheme === "Electric") {
        expect(s.saturation).toBeGreaterThanOrEqual(85);
      } else if (s.colorScheme === "Vintage") {
        expect(s.saturation).toBeLessThanOrEqual(60);
        expect(s.lightness).toBeLessThanOrEqual(60);
      } else if (s.colorScheme === "Monochromatic") {
        s.lines.forEach((l) => {
          expect(l.customLightness).toBeGreaterThanOrEqual(30);
          expect(l.customLightness).toBeLessThanOrEqual(80);
        });
      } else {
        s.lines.forEach((l) => expect(l.customLightness).toBeUndefined());
      }
    }
    expect(seen.has("Pastel")).toBe(true);
    expect(seen.has("Neon")).toBe(true);
    expect(seen.has("Vintage")).toBe(true);
    expect(seen.has("Monochromatic")).toBe(true);
  });
});

describe("getLineStyle", () => {
  const sphere = {
    lines: [],
    sphereSize: 150,
    lineWidth: 1.2,
    glowIntensity: 10,
    rotationSpeed: 4,
    saturation: 80,
    lightness: 60,
    colorScheme: "Single",
  } as any;
  const line = { id: 1, angleX: 10, angleY: 20, angleZ: 30, hue: 350, speed: 2 } as any;
  const fx = {
    hueShift: 20,
    saturationBoost: 50,
    lightnessShift: -10,
    glowMultiplier: 2,
    speedMultiplier: 0.5,
    scaleMultiplier: 1.5,
  } as any;

  it("styles an un-hovered line from base values and the global hue shift", () => {
    const s = getLineStyle(line, sphere, 30, null, fx, 0.75);
    expect(s.borderColor).toBe("hsla(20, 80%, 60%, 0.75)");
    expect(s.transform).toBe("rotateX(10deg) rotateY(20deg) rotateZ(30deg) scale(1)");
    expect(s.borderWidth).toBe("1.2px");
    expect(s.boxShadow).toBe("0 0 10px hsla(20, 80%, 60%, 0.75)");
    expect(s.animationDuration).toBe("8s");
    expect(s.zIndex).toBe(1);
  });

  it("applies hover effects only to the hovered line, clamping saturation", () => {
    const s = getLineStyle(line, sphere, 30, 1, fx, 1);
    expect(s.borderColor).toBe("hsla(40, 100%, 50%, 1)");
    expect(s.boxShadow).toBe("0 0 20px hsla(40, 100%, 50%, 1)");
    expect(s.animationDuration).toBe("4s");
    expect(s.transform).toContain("scale(1.5)");
    expect(s.zIndex).toBe(10);
    const other = getLineStyle(line, sphere, 30, 2, fx, 1);
    expect(other.zIndex).toBe(1);
  });

  it("prefers a line's customLightness and clamps hovered lightness to [0, 100]", () => {
    const mono = { ...line, customLightness: 5 };
    const s = getLineStyle(mono, sphere, 0, 1, { ...fx, lightnessShift: -50 }, 1);
    expect(s.borderColor).toContain(", 0%,");
    expect(getLineStyle(mono, sphere, 0, null, fx, 1).borderColor).toContain(", 5%,");
  });
});
