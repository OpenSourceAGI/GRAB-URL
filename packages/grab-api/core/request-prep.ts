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
        body: body || (isBodyMethod ? JSON.stringify(params) : null),
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
