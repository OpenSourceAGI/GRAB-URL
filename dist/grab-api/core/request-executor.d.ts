/**
 * @file core/request-executor.ts
 * @description Logic for preparing and executing API requests.
 * Handles both mock responses and real network fetch calls.
 */
export { prepareFetchRequest } from './request-prep';
/**
 * Executes the request, either via mock or actual fetch.
 */
export declare function executeRequest(baseURL: string, path: string, paramsGETRequest: string, fetchParams: RequestInit, params: any, onStream: any, unzip?: boolean, dom?: string | boolean): Promise<any>;
