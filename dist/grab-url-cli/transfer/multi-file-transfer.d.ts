/**
 * @file download-multi.ts
 * @description Concurrent multi-file download with a shared MultiBar, per-file
 * progress bars, a master aggregate bar, and speed-update interval.
 *
 * Three exported functions:
 *   downloadMultipleFiles     — orchestrates a batch download session
 *   downloadSingleFileWithBar — downloads one file and updates shared tracking
 *   addFileToMultiBar         — adds a new URL dynamically to a running session
 */
export interface Download {
    url: string;
    outputPath: string;
    filename: string;
    estimatedSize?: number;
    index?: number;
}
export interface TotalTracking {
    totalDownloaded: number;
    totalSize: number;
    individualSpeeds: number[];
    individualSizes: number[];
    individualDownloaded: number[];
    individualStartTimes: number[];
    lastTotalUpdate: number;
    lastTotalDownloaded: number;
    actualTotalSize: number;
}
export interface MultiDownloadContext {
    isPaused: boolean;
    multiBar: any;
    abortControllers: AbortController[];
    setupKeyboard: () => void;
    stateFilePath: (outputPath: string) => string;
    pushAbortController: (c: AbortController) => void;
}
/**
 * Download multiple files concurrently, each with its own progress bar inside
 * a shared MultiBar container and a master aggregate row.
 */
export declare function downloadMultipleFiles(downloads: Download[], ctx: MultiDownloadContext): Promise<void>;
/**
 * Download one file into an existing file-bar slot inside the multi-bar session.
 * Updates the shared TotalTracking as bytes arrive.
 */
export declare function downloadSingleFileWithBar(fileBar: any, masterBar: any, tracking: TotalTracking, ctx: MultiDownloadContext): Promise<void>;
/**
 * Dynamically add a new download to an already-running multi-bar session.
 */
export declare function addFileToMultiBar(url: string, outputPath: string, filename: string, ctx: MultiDownloadContext): Promise<void>;
