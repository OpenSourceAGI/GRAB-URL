/**
 * @file response/response-handler.ts
 * @description Logic for handling API responses.
 * Includes functions for initializing response objects and mapping results.
 */

/**
 * Initializes the response object and result function.
 */
export function initializeResponse<TResponse>(responseOption: any): {
    response: any;
    resFunction: ((data: any) => any) | null;
} {
    const resFunction = typeof responseOption === "function" ? responseOption : null;
    let response = (!responseOption || resFunction) ? {} : responseOption;
    return { response, resFunction };
}

/**
 * Maps the raw result onto the response object.
 */
export function mapResultToResponse(res: any, response: any, resFunction: any, paginateResult: string | null): any {
    if (typeof res === "object" && res !== null) {
        for (let key of Object.keys(res)) {
            response[key] = (paginateResult === key && Array.isArray(response[key]))
                ? [...response[key], ...res[key]]
                : res[key];
        }
        response.data = res;
    } else {
        if (resFunction) {
            response = emitResponse({ data: res, ...res }, resFunction);
        } else if (typeof response === "object") {
            response.data = res;
        }
    }
    return response;
}

/**
 * Hands the next response state to a `response` callback and returns the state
 * the request should carry forward.
 *
 * A React-style setter (`setUserState`) returns undefined, so the object it was
 * handed is the only state the next stage can build on — without this, the
 * request loses its response object halfway through and fails on the result.
 */
export function emitResponse(next: any, resFunction: ((data: any) => any) | null): any {
    if (!resFunction) return next;
    const returned = resFunction(next);
    return returned === undefined || returned === null ? next : returned;
}
