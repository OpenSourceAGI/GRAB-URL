/**
 * @file download-spinners.ts
 * @description Spinner and progress-bar color utilities for the CLI downloader.
 * Loads cli-spinners data once and exposes ergonomic helpers.
 */
/** All available spinner type names from cli-spinners */
export declare const spinnerTypes: string[];
/**
 * Return the frame array for a given spinner type.
 * Falls back to dots if the type is not found.
 */
export declare function getSpinnerFrames(spinnerType: string): string[];
/**
 * Return a random spinner type name.
 */
export declare function getRandomSpinner(): string;
/**
 * Return a random spinner type name (alias for use with ora).
 */
export declare const getRandomOraSpinner: typeof getRandomSpinner;
/**
 * Measure the visual (terminal) width of a spinner frame, accounting for wide emoji.
 */
export declare function getSpinnerWidth(frame: string): number;
/**
 * Calculate an appropriate bar size for the terminal, accounting for the
 * current spinner frame width and fixed UI elements.
 */
export declare function calculateBarSize(spinnerFrame: string, baseBarSize?: number): number;
/** ANSI bar-fill color codes */
export declare const barColors: string[];
/** ANSI bar-glue (separator) color codes */
export declare const barGlueColors: string[];
/** Pick a random bar fill color. */
export declare function getRandomBarColor(): string;
/** Pick a random bar glue color. */
export declare function getRandomBarGlueColor(): string;
