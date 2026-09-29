/**
 * @file core/request-executor.ts
 * @description Logic for preparing and executing API requests.
 * Handles both mock responses and real network fetch calls.
 */

import { GrabFunction } from "../common/types";
import { wait, hasHTMLEntities, convertURLSafeHTMLToHTML, findMockHandler } from "../common/utils";
import { GrabError, fetchFailure } from "../common/grab-error";
import { bodyFailure, type ExecutorHooks } from "./pipeline";
import { processZipResponse, processZipStream, processDomResponse } from "./content-processors";

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
    parseDOM?: string | boolean,
    unescapeHTML?: boolean,
    onRawResponse?: (response: Response) => void,
    hooks?: ExecutorHooks,
): Promise<any> {
    const target = (typeof window !== "undefined" ? window.grab : (globalThis as any).grab) as GrabFunction;
    const mockHandler = findMockHandler(target, path);
    const paramsAsText = JSON.stringify(params);

    if (mockHandler &&
        (!mockHandler.method || mockHandler.method === fetchParams.method) &&
        (!mockHandler.params || paramsAsText === JSON.stringify(mockHandler.params))) {
        hooks?.transport("mock");
        await wait(mockHandler.delay || 0);
        return typeof mockHandler.response === "function" ? mockHandler.response(params) : mockHandler.response;
    }

    hooks?.transport("fetch");
    const fetchRes = await fetch(baseURL + path + paramsGETRequest, fetchParams).catch(e => {
        throw fetchFailure(e, fetchParams.signal);
    });

    // Hand the untouched Response to the caller before parsing so status,
    // statusText and headers stay reachable — the parsed result drops them.
    if (typeof onRawResponse === "function") onRawResponse(fetchRes);
    await hooks?.response(fetchRes);

    if (!fetchRes.ok) throw new GrabError(`HTTP error: ${fetchRes.status} ${fetchRes.statusText}`, {
        code: "HTTP",
        response: fetchRes,
    });

    const type = fetchRes.headers.get("content-type") ?? "";

    // Auto-detect ZIP unless explicitly disabled with unzip: false
    const isZip = unzip !== false && (type.includes("application/zip") || type.includes("application/x-zip"));
    // Auto-detect HTML unless explicitly disabled with parseDOM: false
    const isHtml = parseDOM !== false && (typeof parseDOM === "string" || type.includes("text/html"));

    if (isZip) {
        // Stream-unzip: extract each entry as the archive downloads instead of
        // waiting for the full body. onStream (if set) receives each extracted
        // file the moment it is available.
        if (fetchRes.body) {
            const data = await processZipStream(fetchRes.body, onStream || undefined)
                .catch(e => { throw bodyFailure("Error reading zip: ", e, fetchRes); });
            return { data };
        }
        const buffer = await fetchRes.arrayBuffer().catch(e => { throw bodyFailure("Error reading zip: ", e, fetchRes); });
        return { data: await processZipResponse(buffer) };
    }

    // Non-archive streaming: hand the raw body to the consumer.
    if (onStream) {
        try {
            await onStream(fetchRes.body);
        } catch (e: any) {
            throw new GrabError(e?.message ?? String(e), { code: "STREAM", cause: e, response: fetchRes });
        }
        return null;
    }

    if (isHtml) {
        const html = await fetchRes.text().catch(e => { throw bodyFailure("Error reading html: ", e, fetchRes); });
        return { data: await processDomResponse(html, typeof parseDOM === "string" ? parseDOM : true) };
    }

    const data = await (
        type.includes("application/json")
            ? fetchRes.json()
            : type.includes("application/pdf") || type.includes("application/octet-stream")
                ? fetchRes.blob()
                : type
                    ? fetchRes.text()
                    : fetchRes.json()
    ).catch(e => {
        throw bodyFailure("Error parsing response: ", e, fetchRes);
    });

    // Unescape URL-safe HTML entities in text responses unless disabled with
    // unescapeHTML: false — auto-applied only when entities are detected.
    if (typeof data === "string" && unescapeHTML !== false &&
        (unescapeHTML || hasHTMLEntities(data))) {
        return convertURLSafeHTMLToHTML(data, true);
    }

    return data;
}
