import { createGrab } from "./core/core";
import { executeRequest } from "./core/request-executor-slim";
import { setupDevTools } from "./devtools/devtools";
import { GrabFunction, GrabOptions } from "./common/types";
import { isLocalhost } from "./common/utils";
import { log } from "@grab-url/log";

const grab: GrabFunction = createGrab(executeRequest) as any;

grab.instance = (defaults: Partial<GrabOptions> = {}) =>
  ((path: string, options: Partial<GrabOptions> = {}) =>
    (grab as any)(path, { ...defaults, ...options })) as any;

grab.log = [];
grab.mock = {};
grab.defaults = {};

if (typeof window !== "undefined") {
  // @ts-ignore
  window.log = log;
  window.grab = grab;
  if (isLocalhost()) setupDevTools();

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

export { grab };
export default grab;

export { log };
export * from "./common/types";
export * from "./devtools/devtools";
export * from "./common/utils";
