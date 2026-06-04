/**
 * @file ui/devtools.ts
 * @description Visual development tools for the Grab API.
 * Includes a modal overlay for inspect request history (Ctrl+Alt+I).
 */
/**
 * Shows a message in a modal overlay with a scrollable message stack.
 * Easier to dismiss than native alert() and does not block window execution.
 *
 * @param msg - The message or HTML content to display.
 */
export declare function showAlert(msg: string): void;
/**
 * Sets up development tools for debugging API requests.
 * Adds a keyboard shortcut (Ctrl+Alt+I) to toggle a modal showing the request history from `grab.log`.
 */
export declare function setupDevTools(): void;
