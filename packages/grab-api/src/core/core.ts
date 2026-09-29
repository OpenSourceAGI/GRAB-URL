/**
 * @file core/core.ts
 * @description Main orchestration logic for the Grab API.
 * Defines the primary 'grab' function and coordinates request flow,
 * including option merging, caching, and execution.
 */

import { printJSONStructure, log } from "@grab-url/log";
import { GrabOptions, GrabResponse, GrabFunction, GrabContext } from "../common/types";
import { GrabError, toGrabError } from "../common/grab-error";
import { buildUrl, isLocalhost } from "../common/utils";
import { showAlert } from "../devtools/devtools";

import { getMergedOptions, handleFlowControl } from "./flow-control";
import { handleRegrabEvents } from "./regrab-events";
import {
  emitResponse,
  initializeResponse,
  mapResultToResponse,
} from "../response/response-handler";
import { setupInfiniteScroll } from "../response/infinite-scroll";
import { manageCacheAndPagination } from "./cache-pagination";
import { prepareFetchRequest } from "./request-prep";
import { createMeta, newTraceId, runStage } from "./pipeline";
import type { executeRequest as ExecuteRequestType } from "./request-executor";

type ExecuteRequestFn = typeof ExecuteRequestType;

/**
 * Carries the trace id and attempt number from a failed attempt into its
 * retry. A symbol, so it can never collide with — or be sent as — a param.
 */
const ATTEMPT = Symbol.for("grab.attempt");

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
    // Read elsewhere from `merged` — pulled out here only so utility options
    // never leak into `params` and end up as query string values.
    cacheForTime,
    retryAttempts,
    setDefaults,
    repeat,
    repeatEvery,
    debounce,
    regrabOnStale,
    regrabOnFocus,
    regrabOnNetwork,
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
    onRawResponse,
    unzip,
    parseDOM,
    unescapeHTML,
    body,
    post,
    put,
    patch,
    plugins,
    [ATTEMPT]: attemptInfo,
    ...params
  } = merged as typeof merged & { [ATTEMPT]?: { id: string; attempt: number } };

  const attempt = attemptInfo?.attempt ?? 1;
  const traceId = attemptInfo?.id ?? newTraceId();
  const meta = createMeta(traceId, attempt);
  // Built once the request is prepared; until then a failure (debounce,
  // rate limit) has no URL or init to report, and runs no plugin hooks.
  let ctx: GrabContext | undefined;
  let logEntry: any;

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
  if (resFunction)
    response = emitResponse({ ...response, isLoading: true }, resFunction);
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
      throw new GrabError(
        `Fetch rate limit exceeded for ${path}. Wait ${rateLimit}s between requests.`,
        { code: "RATE_LIMITED" },
      );
    }

    // cache:true pre-fills the prior response above and still refetches.
    meta.cacheStatus = !cache
      ? "bypass"
      : !paginateKeyOf(infiniteScroll) && priorRequest?.response &&
          (!cacheForTime || priorRequest.lastFetchTime > Date.now() - 1000 * cacheForTime)
        ? "revalidated"
        : "miss";

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

    logEntry = {
      path,
      request: paramsAsText,
      lastFetchTime: Date.now(),
      controller,
      meta,
    };
    grabLog.unshift(logEntry);

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

    ctx = {
      id: traceId,
      path,
      url: baseURL + path + paramsGETRequest,
      method: (fetchParams.method as string) || method,
      // prepareFetchRequest always builds headers as a plain object.
      init: fetchParams as GrabContext["init"],
      options: merged,
      params,
      attempt,
      meta,
    };
    const context = ctx;
    await runStage(plugins, "beforeRequest", context);

    const startTime = new Date();
    let res = await executeRequest(
      baseURL,
      path,
      paramsGETRequest,
      fetchParams,
      params,
      onStream,
      unzip,
      parseDOM,
      unescapeHTML,
      onRawResponse,
      {
        transport: (name) => {
          meta.transport = name;
        },
        response: async (raw) => {
          context.response = raw;
          meta.status = raw.status;
          await runStage(plugins, "afterResponse", context);
          await runStage(plugins, "beforeParse", context);
        },
      },
    );

    if (plugins?.length) {
      context.data = res;
      await runStage(plugins, "afterParse", context);
      res = context.data;
    }

    // Clear loading state
    if (resFunction)
      response = emitResponse({ ...response, isLoading: undefined }, resFunction);
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
    if (resFunction) response = emitResponse(response, resFunction);

    finishMeta(meta);
    if (ctx) await runStage(plugins, "finally", ctx);
    return response as any;
  } catch (thrown: any) {
    const error = toGrabError(thrown, {
      url: ctx?.url ?? baseURL + path,
      method: ctx?.method ?? method,
      attempt,
      traceId,
    });
    if (!error.response && ctx?.response) error.response = ctx.response;
    if (error.status === undefined && error.response) error.status = error.response.status;
    finishMeta(meta);
    if (logEntry) logEntry.error = error.message;

    if (ctx) {
      ctx.error = error;
      await runStage(plugins, "onError", ctx);
      await runStage(plugins, "finally", ctx);
    }

    if (typeof onError === "function")
      onError(error.message, baseURL + path, params, error);

    if (merged.retryAttempts && merged.retryAttempts > 0) {
      return await grab(path, {
        ...options,
        retryAttempts: --merged.retryAttempts,
        [ATTEMPT]: { id: traceId, attempt: attempt + 1 },
      } as any);
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
      response = emitResponse(
        { isLoading: undefined, error: error.message },
        resFn,
      );
    } else {
      delete response.isLoading;
    }
    return response as any;
  }
  };
  return grab as any;
}

function finishMeta(meta: { startedAt: number; finishedAt?: number; durationMs?: number }) {
  meta.finishedAt = Date.now();
  meta.durationMs = meta.finishedAt - meta.startedAt;
}

function paginateKeyOf(infiniteScroll: unknown): unknown {
  return Array.isArray(infiniteScroll) ? infiniteScroll[0] : undefined;
}
