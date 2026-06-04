/**
 * @file core/request-executor-slim.ts
 * @description Slim version of request-executor — excludes archiver-web and linkedom.
 * Used by the grab-api/slim build entry.
 */
export { prepareFetchRequest } from './request-prep';
export declare function executeRequest(baseURL: string, path: string, paramsGETRequest: string, fetchParams: RequestInit, params: any, onStream: any, _unzip?: boolean, _dom?: string | boolean): Promise<any>;
