/**
 * @file core/cache-pagination.ts
 * @description Cache management and pagination state tracking.
 * Determines cache hits and updates current page numbers for infinite scroll.
 */
/**
 * Manages cache hits and pagination state updates.
 */
export declare function manageCacheAndPagination(path: string, params: any, mergedOptions: any, response: any, resFunction: any, grabLog: any[]): {
    params: any;
    priorRequest: any;
    response: any;
    paramsAsText: string;
};
