/**
 * @file core/core.ts
 * @description Main orchestration logic for the Grab API.
 * Defines the primary 'grab' function and coordinates request flow,
 * including option merging, caching, and execution.
 */

import { printJSONStructure, log } from "@grab-url/log";
import { GrabOptions, GrabResponse, GrabFunction } from "../common/types";
import { buildUrl, isLocalhost } from "../common/utils";
import { showAlert } from "../devtools/devtools";

import { getMergedOptions, handleFlowControl } from "./flow-control";
import { handleRegrabEvents } from "./regrab-events";
import {
  initializeResponse,
  mapResultToResponse,
} from "../response/response-handler";
import { setupInfiniteScroll } from "../response/infinite-scroll";
import { manageCacheAndPagination } from "./cache-pagination";
import { prepareFetchRequest } from "./request-prep";
import type { executeRequest as ExecuteRequestType } from "./request-executor";

type ExecuteRequestFn = typeof ExecuteRequestType;

/**
 * Creates a grab function using the provided executor — enables slim builds to inject
 * a lighter executor that omits archiver-web / linkedom processing.
 */
export function createGrab(executeRequest: ExecuteRequestFn) {
  const grab = async function grab<TResponse = any, TParams = any>(
    path: string,
    options?: GrabOptions<TResponse, TParams>,
  ): Promise<GrabResponse<TResponse>> {
  const merged = getMergedOptions(options);
  let {
    headers,
    response: responseOption,
    method = merged.post
      ? "POST"
      : merged.put
        ? "PUT"
        : merged.patch
          ? "PATCH"
          : "GET",
    cache,
    timeout = 30,
    baseURL = (typeof process !== "undefined" && process.env.SERVER_API_URL) ||
      "",
    cancelOngoingIfNew,
    cancelNewIfOngoing,
    rateLimit,
    // Enable request/error logging on localhost by default; off in production
    // unless explicitly set to true.
    debug = isLocalhost(),
    infiniteScroll,
    logger = log,
    onRequest,
    onResponse,
    onError,
    onStream,
    unzip,
    parseDOM,
    unescapeHTML,
    body,
    post,
    put,
    patch,
    ...params
  } = merged;

  const urlConfig = buildUrl(baseURL, path);
  baseURL = urlConfig.baseURL;
  path = urlConfig.path;

  const initialized = initializeResponse(responseOption);
  let response: any = initialized.response;
  let resFunction = initialized.resFunction;
  const target = (
    typeof window !== "undefined" ? window.grab : (globalThis as any).grab
  ) as GrabFunction;
  const grabLog = target?.log || [];

  // Set loading state synchronously before any await
  if (resFunction) response = resFunction({ ...response, isLoading: true });
  else if (typeof response === "object") response.isLoading = true;

  try {
    const flowResult = await handleFlowControl(
      path,
      options || {},
      merged,
      grab as unknown as GrabFunction,
    );
    if (flowResult) return flowResult as any;

    handleRegrabEvents(path, options || {}, merged, grab as unknown as GrabFunction);

    let {
      params: updatedParams,
      priorRequest,
      response: updatedResponse,
      paramsAsText,
    } = manageCacheAndPagination(
      path,
      params,
      merged,
      response,
      resFunction,
      grabLog,
    );
    params = updatedParams;
    response = updatedResponse;

    setupInfiniteScroll(path, options, infiniteScroll, priorRequest, grab as unknown as GrabFunction);

    if (
      rateLimit > 0 &&
      priorRequest?.lastFetchTime > Date.now() - 1000 * rateLimit
    ) {
      throw new Error(
        `Fetch rate limit exceeded for ${path}. Wait ${rateLimit}s between requests.`,
      );
    }

    if (priorRequest?.controller) {
      if (cancelOngoingIfNew) priorRequest.controller.abort();
      else if (cancelNewIfOngoing) return { isLoading: true } as GrabResponse;
    }

    const controller = new AbortController();
    let signal = controller.signal;

    // Add timeout if requested (and signal not already used for cancellation)
    if (!cancelOngoingIfNew && typeof AbortSignal.timeout === "function") {
      signal = AbortSignal.timeout(timeout * 1000);
    }

    grabLog.unshift({
      path,
      request: paramsAsText,
      lastFetchTime: Date.now(),
      controller,
    });

    let { fetchParams, paramsGETRequest } = prepareFetchRequest(
      method,
      headers,
      body,
      params,
      !!cache,
      signal,
    );

    if (typeof onRequest === "function") {
      const modified = onRequest(path, response, params, fetchParams);
      if (Array.isArray(modified))
        [path, response, params, fetchParams] = modified;
    }

    const startTime = new Date();
    const res = await executeRequest(
      baseURL,
      path,
      paramsGETRequest,
      fetchParams,
      params,
      onStream,
      unzip,
      parseDOM,
      unescapeHTML,
    );

    // Clear loading state
    if (resFunction)
      response = resFunction({ ...response, isLoading: undefined });
    else if (typeof response === "object") delete response.isLoading;

    if (typeof onResponse === "function") {
      const modified = onResponse(path, response, params, fetchParams);
      if (Array.isArray(modified))
        [path, response, params, fetchParams] = modified;
    }

    const elapsedTime = (
      (Number(new Date()) - Number(startTime)) /
      1000
    ).toFixed(1);
    if (debug) {
      logger(
        `Path:${baseURL + path + paramsGETRequest}\n${JSON.stringify(options, null, 2)}\nTime: ${elapsedTime}s\nResponse: ${printJSONStructure(res)}`,
      );
    }

    const [, paginateResult] = (infiniteScroll as any) || [];
    response = mapResultToResponse(res, response, resFunction, paginateResult);

    if (grabLog[0]) grabLog[0].response = response;
    if (resFunction) response = resFunction(response);

    return response as any;
  } catch (error: any) {
    if (typeof onError === "function")
      onError(error.message, baseURL + path, params);

    if (merged.retryAttempts && merged.retryAttempts > 0) {
      return await grab(path, {
        ...options,
        retryAttempts: --merged.retryAttempts,
      });
    }

    if (!error.message.includes("signal") && debug) {
      logger(`Error: ${error.message}\nPath:${baseURL + path}\n`, {
        color: "red",
      });
      if (typeof document !== "undefined") showAlert(error.message);
    }

    response = response || {};
    response.error = error.message;
    const resFn = typeof responseOption === "function" ? responseOption : null;
    if (resFn) {
      response.data = resFn({ isLoading: undefined, error: error.message });
      response = response.data;
    } else {
      delete response.isLoading;
    }
    return response as any;
  }
  };
  return grab as any;
}
