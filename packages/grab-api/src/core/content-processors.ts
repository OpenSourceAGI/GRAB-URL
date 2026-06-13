/**
 * @file core/content-processors.ts
 * @description Optional heavy content processors for zip and HTML DOM responses.
 * Not included in the slim build.
 */

export async function processZipResponse(buffer: ArrayBuffer): Promise<Record<string, string>> {
    const { extract } = await import("archiver-web");
    const files = await extract({ archiveBuffer: buffer });
    const result: Record<string, string> = {};
    for (const file of files) {
        result[file.path] = file.content;
    }
    return result;
}

/**
 * Stream-unzip a ZIP response, extracting each entry as the bytes arrive
 * instead of waiting for the whole archive to download. `onFile` (if given)
 * is invoked with each entry the moment it is extracted.
 */
export async function processZipStream(
    stream: ReadableStream<Uint8Array>,
    onFile?: (file: { path: string; content: string; size: number }) => void,
): Promise<Record<string, string>> {
    const { extractStream } = await import("archiver-web");
    const result: Record<string, string> = {};
    await extractStream({
        stream,
        onFile: (file) => {
            result[file.path] = file.content;
            if (typeof onFile === "function") onFile(file);
        },
    });
    return result;
}

export async function processDomResponse(html: string, selector: string | boolean): Promise<any> {
    const { parseHTML } = await import("linkedom");
    const { document } = parseHTML(html);
    if (!selector || selector === true) return document;
    const el = document.querySelector(selector as string);
    return el ? el.innerHTML ?? el.textContent : null;
}
