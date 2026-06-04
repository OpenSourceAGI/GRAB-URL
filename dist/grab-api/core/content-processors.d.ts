/**
 * @file core/content-processors.ts
 * @description Optional heavy content processors for zip and HTML DOM responses.
 * Not included in the slim build.
 */
export declare function processZipResponse(buffer: ArrayBuffer): Promise<Record<string, string>>;
export declare function processDomResponse(html: string, selector: string | boolean): Promise<any>;
