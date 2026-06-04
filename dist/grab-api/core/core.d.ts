import { executeRequest as ExecuteRequestType } from './request-executor';
type ExecuteRequestFn = typeof ExecuteRequestType;
/**
 * Creates a grab function using the provided executor — enables slim builds to inject
 * a lighter executor that omits archiver-web / linkedom processing.
 */
export declare function createGrab(executeRequest: ExecuteRequestFn): any;
export {};
