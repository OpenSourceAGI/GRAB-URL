/**
 * @file logging/log-json.ts
 * @description Main entry point for the colorized logging system.
 * Provides the 'log' function and manages spinner animations.
 */

import { ColorName, getColors } from "./colors";
import { printJSONStructure } from "./structure";

export { ColorName, getColors, printJSONStructure };

/**
 * ### Colorized Log With JSON Structure
 */
export function log(message: string | object = "", options: LogOptions = {}) {
  let {
    color,
    style = "color:rgb(54, 165, 220); font-size: 10pt;",
    hideInProduction = undefined,
    startSpinner = false,
    stopSpinner = false,
  } = options;
  const colors = getColors();

  // Auto-detect if we should hide logs in production based on hostname
  if (typeof hideInProduction === "undefined")
    hideInProduction =
      typeof window !== "undefined" &&
      window?.location.hostname.includes("localhost");

  // For objects, print both the structure visualization and full JSON
  if (typeof message === "object")
    message =
      printJSONStructure(message) + "\n\n" + JSON.stringify(message, null, 2);

  // change color: [red] to color: red if only one
  if (Array.isArray(color) && color.length == 1) color = color[0] as any;

  //colorize in terminal (%c is only in browser but we polyfill it)
  if (color && typeof process !== "undefined") {
    if (typeof message === "string" && message.includes("%c") && Array.isArray(color)) {
      message = message.replace(/%c/g, (match, index) => colors[color[index] as ColorName] || "");
    } else if (color && typeof color === "string") {
      message = (colors[color as ColorName] || "") + message + colors.reset;
    }
  }

  // Displays an animated spinner in the terminal with the provided text.
  var i = 0;

  if (startSpinner)
    ((globalThis as any).interval) = setInterval(() => {
      process.stdout.write(
        (Array.isArray(color) ? colors[color[0] as ColorName] : colors[color as ColorName] || "") +
        "\r" +
        "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏".split("")[(i = ++i % 10)] +
        " " +
        message +
        colors.reset
      );
    }, 50);
  else if (stopSpinner) {
    clearInterval((globalThis as any).interval);
    process.stdout.write(
      "\r" + (message || " ") + " ".repeat(typeof message === "string" ? message.length + 20 : 40) + "\n"
    );
  } else if (typeof style === "string") {
    if (style.split(" ").length == 1 || color) {
      style = `color: ${color || style}; font-size: 11pt;`;
    } else {
      if (style.match(/^#[0-9a-fA-F]{6}$/)) {
        style = `color: ${style}; font-size: 11pt;`;
      }
    }
    if (hideInProduction)
      console.debug((style ? "%c" : "") + (message || ""), style);
    else console.log((style ? "%c" : "") + (message || ""), style);
  } else if (typeof style === "object") console.log(message, ...(style as any));
  return true;
}

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
