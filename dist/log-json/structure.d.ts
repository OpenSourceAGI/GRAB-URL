/**
 * @file logging/structure.ts
 * @description Utility for visualizing nested JSON object structures.
 * Provides color-coded type descriptions and hierarchical indentation.
 */
/**
 * Determines the appropriate color code for a given value type
 */
export declare function getColorForType(value: any, colorFormat?: 'html' | 'ansi'): string;
/**
 * Returns a string representation of the value's type
 */
export declare function getTypeString(value: any): string;
/**
 * Creates a colored visualization of a JSON object's structure.
 * In html mode, objects and arrays are wrapped in collapsible <details> elements.
 */
export declare function printJSONStructure(obj: any, indent?: number, colorFormat?: 'html' | 'ansi'): any;
