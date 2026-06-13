/**
 * @file core/regrab-events.ts
 * @description Event listeners for automatic data re-fetching.
 * Handles stale cache, window focus, and network status changes.
 */

import { GrabOptions, GrabFunction } from "../common/types";

/**
 * Sets up event listeners for regrabbing data on stale, focus, or network changes.
 */
export function handleRegrabEvents<TResponse, TParams>(
    path: string,
    options: GrabOptions<TResponse, TParams>,
    mergedOptions: any,
    grab: GrabFunction
): void {
    if (typeof window === "undefined") return;

    const { regrabOnStale, regrabOnFocus, regrabOnNetwork, cache, cacheForTime = 60 } = mergedOptions;
    const regrab = async () => await grab(path, { ...options, cache: false });

    if (regrabOnStale && cache) setTimeout(regrab, 1000 * cacheForTime);
    if (regrabOnNetwork) window.addEventListener("online", regrab);
    if (regrabOnFocus) {
        window.addEventListener("focus", regrab);
        document.addEventListener("visibilitychange", async () => {
            if (document.visibilityState === "visible") await regrab();
        });
    }
}
