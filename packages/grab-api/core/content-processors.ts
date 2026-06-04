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

export async function processDomResponse(html: string, selector: string | boolean): Promise<any> {
    const { parseHTML } = await import("linkedom");
    const { document } = parseHTML(html);
    if (!selector || selector === true) return document;
    const el = document.querySelector(selector as string);
    return el ? el.innerHTML ?? el.textContent : null;
}
