/**
 * @file core/flow-control.ts
 * @description Logic for managing request flow and option merging.
 * Handles debouncing, request repetition, and default option application.
 */

import { GrabOptions, GrabResponse, GrabFunction } from "../common/types";
import { debouncer } from "../common/utils";

/**
 * Merges provided options with global defaults.
 */
export function getMergedOptions<TResponse, TParams>(
    options?: GrabOptions<TResponse, TParams>
): GrabOptions<TResponse, TParams> & { [key: string]: any } {
    const defaults = (typeof window !== "undefined"
        ? window?.grab?.defaults
        : (globalThis as any)?.grab?.defaults || {}) as GrabOptions<TResponse, TParams>;

    return {
        ...defaults,
        ...options,
    };
}

/**
 * Handles flow control logic like debouncing and repeating requests.
 */
export async function handleFlowControl<TResponse, TParams>(
    path: string,
    options: GrabOptions<TResponse, TParams>,
    mergedOptions: any,
    grab: GrabFunction
): Promise<GrabResponse<TResponse> | null> {
    const { debounce = 0, repeat = 0, repeatEvery = null, setDefaults = false } = mergedOptions;

    // Handle debounce
    if (debounce > 0) {
        const task = await debouncer(async () => {
            await grab(path, { ...options, debounce: 0 });
        }, debounce * 1000);
        await task();
        return (mergedOptions.response || {}) as GrabResponse<TResponse>;
    }

    // Handle repeat options
    if (repeat > 1) {
        for (let i = 0; i < repeat; i++) {
            await grab(path, { ...options, repeat: 0 });
        }
        return (mergedOptions.response || {}) as GrabResponse<TResponse>;
    }
    if (repeatEvery) {
        setInterval(async () => {
            await grab(path, { ...options, repeat: 0, repeatEvery: null });
        }, repeatEvery * 1000);
        return (mergedOptions.response || {}) as GrabResponse<TResponse>;
    }

    // Store defaults if requested
    if (setDefaults) {
        const target = (typeof window !== "undefined" ? window.grab : (globalThis as any).grab);
        if (target) {
            target.defaults = { ...options, setDefaults: undefined };
        }
        return (mergedOptions.response || {}) as GrabResponse<TResponse>;
    }

    return null;
}
