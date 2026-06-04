/**
 * @file common/utils.ts
 * @description Common utility functions used across the Grab API.
 * Includes helpers for debouncing, URL building, and asynchronous waiting.
 */
/**
 * Delays execution so that future calls may override and only executes the last one.
 * Useful for search inputs or other high-frequency events.
 *
 * @param func - The function to debounce.
 * @param wait - Time to wait in milliseconds.
 * @returns A debounced version of the function.
 */
export declare const debouncer: (func: Function, wait: number) => Promise<(...args: any[]) => Promise<void>>;
/**
 * Helper function to wait for a specified number of seconds.
 *
 * @param s - Seconds to wait.
 * @returns A promise that resolves after the timeout.
 */
export declare const wait: (s: number) => Promise<unknown>;
/**
 * Normalizes and builds a URL from a base and relative path.
 *
 * @param baseURL - The base API URL.
 * @param path - The specific endpoint path.
 * @returns An object containing the combined URL and updated baseURL/path if needed.
 */
export declare const buildUrl: (baseURL: string, path: string) => {
    baseURL: string;
    path: string;
};
