/**
 * @file logging/structure.ts
 * @description Utility for visualizing nested JSON object structures.
 * Provides color-coded type descriptions and hierarchical indentation.
 */

import { ColorName, getColors } from "./colors";

/**
 * Determines the appropriate color code for a given value type
 */
export function getColorForType(value: any, colorFormat: 'html' | 'ansi' = 'ansi') {
    const colors = getColors(colorFormat);
    if (typeof value === "string") return colors.yellow;
    if (typeof value === "number") return colors.cyan;
    if (typeof value === "boolean") return colors.magenta;
    if (typeof value === "function") return colors.red;
    if (value === null) return colors.gray;
    if (Array.isArray(value)) return colors.blue;
    if (typeof value === "object") return colors.green;
    return colors.white;
}

/**
 * Returns a string representation of the value's type
 */
export function getTypeString(value: any): string {
    if (typeof value === "string") return '""';
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "bool";
    if (typeof value === "function") return "function";
    if (value === null) return "null";
    if (Array.isArray(value)) {
        if (value.length) return "[" + getTypeString(value[0]) + "]";
        else return "[]";
    }
    if (typeof value === "object") return "{...}";
    return typeof value;
}

/**
 * Creates a colored visualization of a JSON object's structure.
 * In html mode, objects and arrays are wrapped in collapsible <details> elements.
 */
export function printJSONStructure(obj: any, indent = 0, colorFormat: 'html' | 'ansi' = 'ansi') {
    const colors = getColors(colorFormat);
    const isHtml = colorFormat === 'html';
    const pad = "  ".repeat(indent);

    // Handle primitive values and null
    if (typeof obj !== "object" || obj === null) {
        const color = getColorForType(obj, colorFormat);
        return color + getTypeString(obj) + colors.reset;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        if (isHtml) {
            let innerItems: string[] = [];
            if (obj.length) {
                if (obj.every((item) => typeof item === typeof obj[0])) {
                    innerItems = [printJSONStructure(obj[0], indent + 1, colorFormat)];
                } else {
                    innerItems = obj.map((item) => printJSONStructure(item, indent + 1, colorFormat));
                }
            }
            const summary = `${colors.blue}[${colors.reset}&thinsp;${obj.length} × ${getTypeString(obj[0] ?? undefined)}&thinsp;${colors.blue}]${colors.reset}`;
            const inner = innerItems.map((item) => `<div style="margin-left:1.5em">${item}</div>`).join("");
            return `<details open><summary style="cursor:pointer;display:inline">${summary}</summary>${inner}</details>`;
        }

        let result = colors.blue + "[" + colors.reset;
        if (obj.length) result += "\n";
        if (obj.every((item) => typeof item === typeof obj[0])) {
            result += pad + "  " + printJSONStructure(obj[0], indent + 1, colorFormat) + ",\n";
        } else {
            obj.forEach((item, idx) => {
                result += pad + "  " + printJSONStructure(item, indent + 1, colorFormat);
                if (idx < obj.length - 1) result += ",";
                result += "\n";
            });
        }
        result += pad + colors.blue + "]" + colors.reset;
        return result;
    }

    // Handle objects
    const keys = Object.keys(obj);

    if (isHtml) {
        const summaryKeys = keys.slice(0, 4).join(", ") + (keys.length > 4 ? "…" : "");
        const summary = `${colors.green}{${colors.reset}&nbsp;${summaryKeys}&nbsp;${colors.green}}${colors.reset}`;
        const rows = keys.map((key) => {
            const value = obj[key];
            const color = getColorForType(value, colorFormat);
            if (typeof value === "object" && value !== null) {
                return `<div style="margin-left:1.5em">${color}${key}${colors.reset}: ${printJSONStructure(value, indent + 1, colorFormat)}</div>`;
            } else {
                return `<div style="margin-left:1.5em">${color}${key}: ${getTypeString(value)}${colors.reset}</div>`;
            }
        }).join("");
        return `<details open><summary style="cursor:pointer">${summary}</summary>${rows}</details>`;
    }

    let result = colors.green + "{" + colors.reset;
    if (keys.length) result += "\n";
    keys.forEach((key, index) => {
        const value = obj[key];
        const color = getColorForType(value, colorFormat);
        result += pad + "  ";
        if (typeof value === "object" && value !== null) {
            result += color + key + colors.reset + ": " + printJSONStructure(value, indent + 1, colorFormat);
        } else {
            result += color + key + ": " + getTypeString(value) + colors.reset;
        }
        if (index < keys.length - 1) result += ",";
        result += "\n";
    });
    result += pad + colors.green + "}" + colors.reset;
    return result;
}
