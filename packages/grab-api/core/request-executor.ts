/**
 * @file core/request-executor.ts
 * @description Logic for preparing and executing API requests.
 * Handles both mock responses and real network fetch calls.
 */

import { GrabFunction, GrabMockHandler } from "../common/types";
import { wait } from "../common/utils";
import { processZipResponse, processDomResponse } from "./content-processors";

export { prepareFetchRequest } from "./request-prep";

/**
 * Executes the request, either via mock or actual fetch.
 */
export async function executeRequest(
    baseURL: string,
    path: string,
    paramsGETRequest: string,
    fetchParams: RequestInit,
    params: any,
    onStream: any,
    unzip?: boolean,
    dom?: string | boolean,
): Promise<any> {
    const target = (typeof window !== "undefined" ? window.grab : (globalThis as any).grab) as GrabFunction;
    const mockHandler = target?.mock?.[path] as GrabMockHandler;
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

    if (!fetchRes.ok) throw new Error(`HTTP error: ${fetchRes.status} ${fetchRes.statusText}`);

    if (onStream) {
        await onStream(fetchRes.body);
        return null;
    }

    const type = fetchRes.headers.get("content-type") ?? "";

    // Auto-detect ZIP unless explicitly disabled with unzip: false
    const isZip = unzip !== false && (type.includes("application/zip") || type.includes("application/x-zip"));
    // Auto-detect HTML unless explicitly disabled with dom: false
    const isHtml = dom !== false && (typeof dom === "string" || type.includes("text/html"));

    if (isZip) {
        const buffer = await fetchRes.arrayBuffer().catch(e => { throw new Error("Error reading zip: " + e); });
        return { data: await processZipResponse(buffer) };
    }

    if (isHtml) {
        const html = await fetchRes.text().catch(e => { throw new Error("Error reading html: " + e); });
        return { data: await processDomResponse(html, typeof dom === "string" ? dom : true) };
    }

    return await (
        type.includes("application/json")
            ? fetchRes.json()
            : type.includes("application/pdf") || type.includes("application/octet-stream")
                ? fetchRes.blob()
                : type
                    ? fetchRes.text()
                    : fetchRes.json()
    ).catch(e => {
        throw new Error("Error parsing response: " + e);
    });
}
