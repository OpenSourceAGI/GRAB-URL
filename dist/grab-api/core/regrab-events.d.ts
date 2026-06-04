import { GrabOptions, GrabFunction } from '../common/types';
/**
 * Sets up event listeners for regrabbing data on stale, focus, or network changes.
 */
export declare function handleRegrabEvents<TResponse, TParams>(path: string, options: GrabOptions<TResponse, TParams>, mergedOptions: any, grab: GrabFunction): void;
