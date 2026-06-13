/**
 * @file core/cache-pagination.ts
 * @description Cache management and pagination state tracking.
 * Determines cache hits and updates current page numbers for infinite scroll.
 */

/**
 * Manages cache hits and pagination state updates.
 */
export function manageCacheAndPagination(
    path: string,
    params: any,
    mergedOptions: any,
    response: any,
    resFunction: any,
    grabLog: any[]
): { params: any; priorRequest: any; response: any; paramsAsText: string } {
    const { cache, cacheForTime, infiniteScroll } = mergedOptions;
    const [paginateKey, paginateResult] = (infiniteScroll as any) || [];

    const paramsAsText = JSON.stringify(
        paginateKey ? { ...params, [paginateKey as string]: undefined } : params
    );

    let priorRequest = grabLog.find(e => e.request === paramsAsText && e.path === path);

    if (!paginateKey) {
        // Clear response for fresh request
        for (let key of Object.keys(response)) response[key] = undefined;

        // Cache hit check
        if (cache && priorRequest?.response &&
            (!cacheForTime || priorRequest.lastFetchTime > Date.now() - 1000 * cacheForTime)) {
            for (let key of Object.keys(priorRequest.response)) {
                response[key] = priorRequest.response[key];
            }
            if (resFunction) response = resFunction(response);
        }
    } else {
        // Pagination logic
        let pageNumber = (priorRequest?.currentPage || 0) + 1 || params?.[paginateKey] || 1;
        if (!priorRequest) {
            response[paginateResult] = [];
            pageNumber = 1;
        } else {
            priorRequest.currentPage = pageNumber;
        }
        params = { ...params, [paginateKey]: pageNumber };
    }

    return { params, priorRequest, response, paramsAsText };
}
