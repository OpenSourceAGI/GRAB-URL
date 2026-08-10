/**
 * @file core/request-executor-slim.ts
 * @description Slim version of request-executor — excludes archiver-web and linkedom.
 * Used by the grab-api/slim build entry.
 */

import { GrabFunction } from "../common/types";
import { wait, hasHTMLEntities, convertURLSafeHTMLToHTML, findMockHandler } from "../common/utils";

export { prepareFetchRequest } from "./request-prep";

export async function executeRequest(
    baseURL: string,
    path: string,
    paramsGETRequest: string,
    fetchParams: RequestInit,
    params: any,
    onStream: any,
    _unzip?: boolean,
    _parseDOM?: string | boolean,
    unescapeHTML?: boolean,
    onRawResponse?: (response: Response) => void,
): Promise<any> {
    const target = (typeof window !== "undefined" ? window.grab : (globalThis as any).grab) as GrabFunction;
    const mockHandler = findMockHandler(target, path);
    const paramsAsText = JSON.stringify(params);

    if (mockHandler &&
        (!mockHandler.method || mockHandler.method === fetchParams.method) &&
        (!mockHandler.params || paramsAsText === JSON.stringify(mockHandler.params))) {
        await wait(mockHandler.delay || 0);
        return typeof mockHandler.response === "function" ? mockHandler.response(params) : mockHandler.response;
    }

    const fetchRes = await fetch(baseURL + path + paramsGETRequest, fetchParams).catch(e => {
        throw new Error(e.message);
    });

    // Hand the untouched Response to the caller before parsing so status,
    // statusText and headers stay reachable — the parsed result drops them.
    if (typeof onRawResponse === "function") onRawResponse(fetchRes);

    if (!fetchRes.ok) throw new Error(`HTTP error: ${fetchRes.status} ${fetchRes.statusText}`);

    if (onStream) {
        await onStream(fetchRes.body);
        return null;
    }

    const type = fetchRes.headers.get("content-type") ?? "";

    const data = await (
        type.includes("application/json")
            ? fetchRes.json()
            : type.includes("application/pdf") || type.includes("application/octet-stream") ||
              type.includes("application/zip") || type.includes("application/x-zip")
                ? fetchRes.blob()
                : type
                    ? fetchRes.text()
                    : fetchRes.json()
    ).catch(e => {
        throw new Error("Error parsing response: " + e);
    });

    // Unescape URL-safe HTML entities in text responses unless disabled with
    // unescapeHTML: false — auto-applied only when entities are detected.
    if (typeof data === "string" && unescapeHTML !== false &&
        (unescapeHTML || hasHTMLEntities(data))) {
        return convertURLSafeHTMLToHTML(data, true);
    }

    return data;
}
