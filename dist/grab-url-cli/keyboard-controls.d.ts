/**
 * @description Raw-mode keyboard listener and interactive URL-prompt for the CLI downloader.
 * Receives callbacks so it stays decoupled from MultiColorFileDownloaderCLI internals.
 */
export interface KeyboardCallbacks {
    isPaused: () => boolean;
    pauseAll: () => void;
    resumeAll: () => void;
    isAddingUrl: () => boolean;
    setAddingUrl: (v: boolean) => void;
    hasMultiBar: () => boolean;
    addToMultipleDownloads: (url: string, outputPath: string, filename: string) => Promise<void>;
    downloadFile: (url: string, outputPath: string) => Promise<void>;
}
/**
 * Attach a raw-mode stdin listener.
 * - Ctrl+C → exit
 * - p      → toggle pause/resume
 * - a      → prompt to add a URL
 */
export declare function setupKeyboardListener(callbacks: KeyboardCallbacks): void;
/**
 * Tear down raw mode (called on cleanup).
 */
export declare function teardownKeyboardListener(): void;
/**
 * Interactively prompt the user for a new URL and start downloading it,
 * either adding it to an existing multi-bar or starting a standalone download.
 */
export declare function promptForNewUrl(callbacks: KeyboardCallbacks): Promise<void>;
/** Check whether a string is a valid URL. */
export declare function isValidUrl(url: string): boolean;
/** Derive a local filename from a URL pathname. */
export declare function generateFilename(url: string, dir?: string): string;
/** Extract the file extension from a URL pathname. */
export declare function getFileExtension(url: string): string;
