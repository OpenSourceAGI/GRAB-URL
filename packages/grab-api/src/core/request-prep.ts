/**
 * @file core/request-prep.ts
 * @description Prepares fetch parameters and URL query strings.
 * Shared by both full and slim executors with no heavy deps.
 */

export function prepareFetchRequest(
    method: string,
    headers: any,
    body: any,
    params: any,
    cache: boolean,
    signal: AbortSignal
): { fetchParams: RequestInit; paramsGETRequest: string } {
    const isBodyMethod = ["POST", "PUT", "PATCH"].includes(method);

    const fetchParams: RequestInit = {
        method,
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...headers,
        },
        // Only an omitted body falls back to the params for POST/PUT/PATCH —
        // an explicit `body: null` sends no body at all.
        body: body === undefined
            ? (isBodyMethod ? JSON.stringify(params) : null)
            : body,
        redirect: "follow",
        cache: cache ? "force-cache" : "no-store",
        signal,
    };

    let paramsGETRequest = "";
    if (!isBodyMethod) {
        paramsGETRequest = (Object.keys(params).length ? "?" : "") + new URLSearchParams(params).toString();
    }

    return { fetchParams, paramsGETRequest };
}
