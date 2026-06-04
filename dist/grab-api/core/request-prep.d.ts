/**
 * @file core/request-prep.ts
 * @description Prepares fetch parameters and URL query strings.
 * Shared by both full and slim executors with no heavy deps.
 */
export declare function prepareFetchRequest(method: string, headers: any, body: any, params: any, cache: boolean, signal: AbortSignal): {
    fetchParams: RequestInit;
    paramsGETRequest: string;
};
