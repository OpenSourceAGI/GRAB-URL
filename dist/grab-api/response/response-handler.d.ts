/**
 * @file response/response-handler.ts
 * @description Logic for handling API responses.
 * Includes functions for initializing response objects and mapping results.
 */
/**
 * Initializes the response object and result function.
 */
export declare function initializeResponse<TResponse>(responseOption: any): {
    response: any;
    resFunction: ((data: any) => any) | null;
};
/**
 * Maps the raw result onto the response object.
 */
export declare function mapResultToResponse(res: any, response: any, resFunction: any, paginateResult: string | null): any;
