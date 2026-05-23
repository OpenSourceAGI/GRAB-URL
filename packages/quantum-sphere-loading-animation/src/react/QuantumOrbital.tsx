"use client"

/**
 * @module QuantumOrbital
 * React implementation of the QuantumOrbital animated loader.
 *
 * Inspired by quantum superposition of atomic orbitals and the
 * [wave function collapse](https://en.wikipedia.org/wiki/Wave_function_collapse).
 * The sphere periodically re-randomizes (color scheme, line count, glow,
 * rotation) and reacts to mouse hover with per-line color/glow flair.
 *
 * Renders a stack of CSS-rotated bordered divs sharing the same parent
 * 3D-transform space, so the spinning is pure CSS while the randomization
 * lives in React state.
 *
 * @author [vtempest](https://github.com/vtempest)
 */
import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { DEFAULT_ORBITAL_SPHERE_CONFIG } from "../shared/defaults"
import { getLineStyle } from "../shared/getLineStyle"
import type {
  HoverEffects,
  OrbitalLine,
  OrbitalSphereProps,
  SphereData,
} from "../types/QuantumOrbital"
import { useRandom } from "./useRandom"
import { useSphereConfig } from "./useSphereConfig"

const keyframesCSS = `
@keyframes orbitalSpin {
  from { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
  to { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
}
@keyframes orbitalLineSpin {
  from { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
  to { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
}
`

const styles = {
  orbitalSphere: {
    perspective: "1000px",
  } as React.CSSProperties,
  orbitalLine: {
    animation: "orbitalLineSpin infinite linear",
  } as React.CSSProperties,
}

/**
 * Animated quantum-orbital loader component.
 *
 * @param config - Range/min-max bounds for line count, sphere size, colors, etc.
 * @param autoRandomize - When true, the sphere periodically re-randomizes and shifts hue.
 * @param className - Extra CSS classes appended to the outer wrapper.
 * @param onSphereClick - Click callback fired when the sphere container is clicked.
 */
export default function QuantumOrbital({
  config = DEFAULT_ORBITAL_SPHERE_CONFIG,
  autoRandomize = true,
  className = "",
  onSphereClick = null,
}: OrbitalSphereProps) {
  const rng = useRandom()
  const { randomRange } = rng
  const generateSphereConfig = useSphereConfig(config, rng)

  const [sphereData, setSphereData] = useState<SphereData>(() => generateSphereConfig(config))
  const [hueShift, setHueShift] = useState<number>(0)
  const [hoveredLineId, setHoveredLineId] = useState<number | null>(null)
  const [hoverEffects, setHoverEffects] = useState<HoverEffects>({} as HoverEffects)
  const sphereRef = useRef<HTMLDivElement>(null)
  const timeoutIdRef = useRef<number | null>(null)
  const hueTimeoutIdRef = useRef<number | null>(null)

  /**
   * Document-level pointer tracker. Determines whether the cursor is currently
   * over the sphere and, if so, which orbital line element is under it (via
   * `data-line-id`). Picks a fresh batch of {@link HoverEffects} on hover
   * transitions so the highlighted line gets unique flair each time.
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent): void => {
      if (!sphereRef.current) return

      const sphereRect = sphereRef.current.getBoundingClientRect()
      const isOverSphere =
        event.clientX >= sphereRect.left &&
        event.clientX <= sphereRect.right &&
        event.clientY >= sphereRect.top &&
        event.clientY <= sphereRect.bottom

      if (!isOverSphere) {
        setHoveredLineId(null)
        return
      }

      const elementFromPoint = document.elementFromPoint(event.clientX, event.clientY)
      if (elementFromPoint && (elementFromPoint as HTMLElement).dataset.lineId) {
        const lineId = Number.parseInt((elementFromPoint as HTMLElement).dataset.lineId!)
        if (lineId !== hoveredLineId) {
          setHoveredLineId(lineId)
          setHoverEffects({
            hueShift: randomRange(-90, 90),
            saturationBoost: randomRange(10, 30),
            lightnessShift: randomRange(-20, 20),
            glowMultiplier: randomRange(1.5, 3),
            speedMultiplier: randomRange(0.3, 2.5),
            scaleMultiplier: randomRange(1.1, 1.4),
          })
        }
      } else {
        setHoveredLineId(null)
      }
    },
    [hoveredLineId, randomRange],
  )

  /** Forwards a click on the sphere container to the user-supplied callback. */
  const handleSphereClick = useCallback(
    (_event: React.MouseEvent<HTMLDivElement>): void => {
      if (onSphereClick) {
        onSphereClick()
      }
    },
    [onSphereClick],
  )

  /** Resolve the inline style for one orbital line via the shared helper. */
  const styleForLine = useCallback(
    (line: OrbitalLine) =>
      getLineStyle(line, sphereData, hueShift, hoveredLineId, hoverEffects, config.opacity),
    [hoveredLineId, hueShift, sphereData, hoverEffects, config.opacity],
  )

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
    }
  }, [handleMouseMove])

  useEffect(() => {
    if (!autoRandomize) return

    const scheduleNext = () => {
      setSphereData(generateSphereConfig(config))
      const delay = randomRange(config.autoRandomizeMin, config.autoRandomizeMax)
      timeoutIdRef.current = window.setTimeout(scheduleNext, delay)
    }

    const scheduleHueShift = () => {
      setHueShift((prev) => (prev + randomRange(10, 50)) % 360)
      const delay = randomRange(2000, 6000)
      hueTimeoutIdRef.current = window.setTimeout(scheduleHueShift, delay)
    }

    scheduleNext()
    scheduleHueShift()

    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current)
      if (hueTimeoutIdRef.current) clearTimeout(hueTimeoutIdRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRandomize])

  return (
    <div className={`relative flex justify-center items-center ${className}`}>
      <style>{keyframesCSS}</style>
      <div className="relative z-10" onClick={handleSphereClick} ref={sphereRef}>
        <div
          className="relative cursor-pointer"
          style={{
            ...styles.orbitalSphere,
            transformStyle: "preserve-3d",
            animation: `orbitalSpin ${sphereData.rotationSpeed}s infinite linear`,
            width: `${sphereData.sphereSize}px`,
            height: `${sphereData.sphereSize}px`,
          }}
        >
          {sphereData.lines.map((line) => {
            const lineStyle = styleForLine(line)
            return (
              <div
                key={line.id}
                className="absolute inset-0 rounded-full border-solid transition-all duration-200 ease-in-out"
                data-line-id={line.id}
                style={{
                  ...styles.orbitalLine,
                  transform: lineStyle.transform,
                  borderColor: lineStyle.borderColor,
                  borderWidth: lineStyle.borderWidth,
                  boxShadow: lineStyle.boxShadow,
                  animationDuration: lineStyle.animationDuration,
                  zIndex: lineStyle.zIndex,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
