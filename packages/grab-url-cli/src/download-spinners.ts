/**
 * @file download-spinners.ts
 * @description Spinner and progress-bar color utilities for the CLI downloader.
 * Loads cli-spinners data once and exposes ergonomic helpers.
 */

import * as spinnerData from '../loading-animations/cli/loading-animations-emojis.js';

// spinners.js exports named: string | [string, n]
// plain string = n=1 (split per char), [string, n] = split by n chars
type SpinnerEntry = string | [string, number];

function getFrames(entry: SpinnerEntry): string[] {
    const s = typeof entry === 'string' ? entry : entry[0];
    const n = typeof entry === 'string' ? 1 : entry[1];
    const frames: string[] = [];
    for (let i = 0; i < s.length; i += n) {
        frames.push(s.slice(i, i + n));
    }
    return frames;
}

/** All available spinner type names from cli-spinners */
export const spinnerTypes: string[] = Object.keys(spinnerData);

/**
 * Return the frame array for a given spinner type.
 * Falls back to dots if the type is not found.
 */
export function getSpinnerFrames(spinnerType: string): string[] {
    const data = spinnerData as unknown as Record<string, SpinnerEntry>;
    const entry = data[spinnerType];
    if (entry) return getFrames(entry);
    return getFrames(spinnerData.dots);
}

/**
 * Return a random spinner type name.
 */
export function getRandomSpinner(): string {
    return spinnerTypes[Math.floor(Math.random() * spinnerTypes.length)];
}

/**
 * Return a random spinner type name (alias for use with ora).
 */
export const getRandomOraSpinner = getRandomSpinner;

/**
 * Measure the visual (terminal) width of a spinner frame, accounting for wide emoji.
 */
export function getSpinnerWidth(frame: string): number {
    let width = 0;
    for (const char of frame) {
        const code = char.codePointAt(0)!;
        if (
            (code >= 0x1F000 && code <= 0x1F6FF) ||
            (code >= 0x1F300 && code <= 0x1F5FF) ||
            (code >= 0x1F600 && code <= 0x1F64F) ||
            (code >= 0x1F680 && code <= 0x1F6FF) ||
            (code >= 0x1F700 && code <= 0x1F77F) ||
            (code >= 0x1F780 && code <= 0x1F7FF) ||
            (code >= 0x1F800 && code <= 0x1F8FF) ||
            (code >= 0x2600 && code <= 0x26FF) ||
            (code >= 0x2700 && code <= 0x27BF)
        ) {
            width += 2;
        } else {
            width += 1;
        }
    }
    return width;
}

/**
 * Calculate an appropriate bar size for the terminal, accounting for the
 * current spinner frame width and fixed UI elements.
 */
export function calculateBarSize(spinnerFrame: string, baseBarSize = 20): number {
    const terminalWidth = process.stdout.columns || 120;
    const spinnerWidth = getSpinnerWidth(spinnerFrame);
    const otherElements = 59; // percentage + speed + ETA + gaps + colors
    const filenameWidth = 20;
    const available = terminalWidth - otherElements - filenameWidth - spinnerWidth;
    return Math.max(10, Math.min(baseBarSize, available));
}

// ─── ANSI color pools for randomised progress bars ───────────────────────────

/** ANSI bar-fill color codes */
export const barColors: string[] = [
    '\u001b[32m', // green
    '\u001b[33m', // yellow
    '\u001b[34m', // blue
    '\u001b[35m', // magenta
    '\u001b[36m', // cyan
    '\u001b[91m', // bright red
    '\u001b[92m', // bright green
    '\u001b[93m', // bright yellow
    '\u001b[94m', // bright blue
    '\u001b[95m', // bright magenta
    '\u001b[96m', // bright cyan
];

/** ANSI bar-glue (separator) color codes */
export const barGlueColors: string[] = [
    '\u001b[31m', // red
    '\u001b[33m', // yellow
    '\u001b[35m', // magenta
    '\u001b[37m', // white
    '\u001b[90m', // gray
    '\u001b[93m', // bright yellow
    '\u001b[97m', // bright white
];

/** Pick a random bar fill color. */
export function getRandomBarColor(): string {
    return barColors[Math.floor(Math.random() * barColors.length)];
}

/** Pick a random bar glue color. */
export function getRandomBarGlueColor(): string {
    return barGlueColors[Math.floor(Math.random() * barGlueColors.length)];
}
