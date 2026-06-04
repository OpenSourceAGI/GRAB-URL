import { GrabOptions, GrabResponse, GrabFunction } from '../common/types';
/**
 * Merges provided options with global defaults.
 */
export declare function getMergedOptions<TResponse, TParams>(options?: GrabOptions<TResponse, TParams>): GrabOptions<TResponse, TParams> & {
    [key: string]: any;
};
/**
 * Handles flow control logic like debouncing and repeating requests.
 */
export declare function handleFlowControl<TResponse, TParams>(path: string, options: GrabOptions<TResponse, TParams>, mergedOptions: any, grab: GrabFunction): Promise<GrabResponse<TResponse> | null>;
