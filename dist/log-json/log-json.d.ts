import { ColorName, getColors } from './colors';
import { printJSONStructure } from './structure';
export { ColorName, getColors, printJSONStructure };
/**
 * ### Colorized Log With JSON Structure
 */
export declare function log(message?: string | object, options?: LogOptions): boolean;
export interface LogOptions {
    /** CSS style string or array of CSS strings for browser console styling */
    style?: string | string[];
    /** Optional color name or code for terminal environments */
    color?: ColorName | ColorName[] | string | string[];
    /** If true, hides log in production (auto-detects by hostname if undefined) */
    hideInProduction?: boolean;
    /** Start a spinner (for CLI tools, optional) */
    startSpinner?: boolean;
    /** Stop a spinner (for CLI tools, optional) */
    stopSpinner?: boolean;
}
