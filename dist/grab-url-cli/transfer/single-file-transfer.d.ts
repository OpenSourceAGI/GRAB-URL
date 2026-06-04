/**
 * @file download-single.ts
 * @description Standalone single-file download with ora spinner + cli-progress bar,
 * resume support, and keyboard listeners.
 */
export interface SingleDownloadContext {
    /** Whether the download is currently paused */
    isPaused: boolean;
    /** The active progress bar instance (assigned by this function) */
    progressBar: any;
    /** Called to set up keyboard listeners */
    setupKeyboard: () => void;
    /** Called to get the state file path for a given output path */
    stateFilePath: (outputPath: string) => string;
    /** The AbortController for cancellation */
    abortController: AbortController | null;
}
/**
 * Download one file with an ora loading spinner and a cli-progress bar.
 * Supports resume-from-partial, pause/resume, and graceful abort.
 *
 * @param url         Remote URL to fetch
 * @param outputPath  Absolute local destination path
 * @param ctx         Mutable context object (progressBar is written back to it)
 */
export declare function downloadFile(url: string, outputPath: string, ctx: SingleDownloadContext): Promise<void>;
