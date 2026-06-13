/**
 * @file response/infinite-scroll.ts
 * @description Infinite scroll pagination logic.
 * Manages scroll event listeners and triggers automatic next-page fetching.
 */

import { log } from "@grab-url/log";
import { GrabFunction } from "../common/types";

/**
 * Configures infinite scroll listener.
 */
export function setupInfiniteScroll(
  path: string,
  options: any,
  infiniteScroll: any,
  priorRequest: any,
  grab: GrabFunction,
): void {
  if (typeof window === "undefined" || !infiniteScroll?.length) return;

  const [paginateKey, , paginateElement] = infiniteScroll;
  if (typeof paginateElement === "undefined") return;

  let paginateDOM =
    typeof paginateElement === "string"
      ? document.querySelector(paginateElement)
      : paginateElement;

  if (!paginateDOM) {
    log("paginateDOM not found", { color: "red" });
    return;
  }

  if (
    (window as any).scrollListener &&
    typeof (paginateDOM as any).removeEventListener === "function"
  ) {
    (paginateDOM as any).removeEventListener(
      "scroll",
      (window as any).scrollListener,
    );
  }

  (window as any).scrollListener = (event: Event) => {
    const t = event.target as HTMLElement;
    localStorage.setItem(
      "scroll",
      JSON.stringify([t.scrollTop, t.scrollLeft, paginateElement]),
    );

    if (t.scrollHeight - t.scrollTop <= t.clientHeight + 200) {
      grab(path, {
        ...options,
        cache: false,
        [paginateKey as string]: (priorRequest?.currentPage || 0) + 1,
      });
    }
  };

  (paginateDOM as any).addEventListener(
    "scroll",
    (window as any).scrollListener,
  );
}
