import { createGrab } from "./core/core";
import { executeRequest } from "./core/request-executor";
const coreGrab = createGrab(executeRequest);
import { setupDevTools } from "./devtools/devtools";
import { GrabFunction, GrabOptions } from "./common/types";
import { log } from "@grab-url/log";

// Add instance method to the core grab function
const grab: GrabFunction = coreGrab as any;

/**
 * Creates a new instance of grab with default options
 * to apply to all requests made by this instance.
 *
 * @param defaults - Options for all requests made by this instance.
 * @returns A new grab() function using those default options.
 */
grab.instance = (defaults: Partial<GrabOptions> = {}) =>
  ((path: string, options: Partial<GrabOptions> = {}) =>
    coreGrab(path, { ...defaults, ...options })) as any;

// Initialize global state
grab.log = [];
grab.mock = {};
grab.defaults = {};

// Handle global registration for both Browser and Node.js environments
if (typeof window !== "undefined") {
  // @ts-ignore
  window.log = log;
  window.grab = grab;

  // Setup visual dev tools
  setupDevTools();

  // Restore scroll position when page loads for infinite scroll persistence
  document.addEventListener("DOMContentLoaded", () => {
    try {
      const scrollData = localStorage.getItem("scroll");
      if (!scrollData) return;

      const [scrollTop, scrollLeft, paginateElement] = JSON.parse(scrollData);
      if (!scrollTop || !paginateElement) return;

      const el = document.querySelector(paginateElement);
      if (el) {
        el.scrollTop = scrollTop;
        el.scrollLeft = scrollLeft;
      }
    } catch (e) {
      console.warn("Failed to restore scroll position", e);
    }
  });
} else if (typeof globalThis !== "undefined") {
  (globalThis as any).log = log;
  (globalThis as any).grab = grab;
}

// Re-export core function and all types
export { grab };
export default grab;

export { log };
export * from "./common/types";
export * from "./devtools/devtools";
export * from "./common/utils";
