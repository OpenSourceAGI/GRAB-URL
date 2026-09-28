/**
 * @file common/types.ts
 * @description Core type definitions for the Grab API.
 * Defines interfaces for requests, responses, options, and mock handlers.
 */

import { LogOptions } from "@grab-url/log";
import type { GrabError } from "./grab-error";

/**
 * Core response object that gets populated with API response data.
 * @template TResponse The expected shape of the response data.
 */
export type GrabResponse<TResponse = any> = TResponse & {
  /** Indicates if request is currently in progress */
  isLoading?: boolean;
  /** Error message if request failed */
  error?: string;
  /** Binary or text response data (JSON is set to the root)*/
  data?: TResponse | any;
  /** The actual response data - type depends on API endpoint */
  [key: string]: unknown;
};

/**
 * Configuration options for the grab request.
 * @template TResponse The expected shape of the response data.
 * @template TParams The shape of the request parameters.
 */
export type GrabOptions<TResponse = any, TParams = any> = {
  /** include headers and authorization in the request */
  headers?: Record<string, string>;
  /** Pre-initialized object which becomes response JSON, no need for .data */
  response?: TResponse | ((params: TParams) => TResponse) | any;
  /** default="GET" The HTTP method to use */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
  /** default=false Whether to cache the request and from frontend cache */
  cache?: boolean;
  /** default=60 Seconds to consider data stale and invalidate cache */
  cacheForTime?: number;
  /** default=30 The timeout for the request in seconds */
  timeout?: number;
  /** default=auto-detect Base URL to prepend to path, auto-detects from SERVER_API_URL env var  */
  baseURL?: string;
  /** default=true Cancel previous requests to same path */
  cancelOngoingIfNew?: boolean;
  /** default=false Cancel if a request to path is in progress */
  cancelNewIfOngoing?: boolean;
  /** default=false If set, how many seconds to wait between requests */
  rateLimit?: number;
  /** default=true on localhost, false in production. Whether to log the request and response */
  debug?: boolean;
  /** default=null [page key, response field to concatenate, element with results] */
  infiniteScroll?: [string, string, string | HTMLElement];
  /** default=false Pass this with options to set those options as defaults for all requests */
  setDefaults?: boolean;
  /** default=0 Retry failed requests this many times */
  retryAttempts?: number;
  /** default=log Custom logger to override the built-in color JSON log() */
  logger?: (...args: any[]) => void;
  /** Set with defaults to modify each request data. Takes and returns in order: path, response, params, fetchParams */
  onRequest?: (...args: any[]) => any;
  /** Set with defaults to modify each request data. Takes and returns in order: path, response, params, fetchParams */
  onResponse?: (...args: any[]) => any;
  /** Set with defaults to observe failures. Called with: error message, full URL,
   * params, and the classified GrabError (code, response, attempt, retryable). */
  onError?: (...args: any[]) => any;
  /** Lifecycle plugins, run in order at each stage of the request pipeline.
   * Set them on defaults or an instance to apply to every request. */
  plugins?: GrabPlugin[];
  /** Called with the raw fetch Response as soon as it arrives, before status
   * checks and body parsing. Use it to read status, statusText and headers,
   * which the parsed response object does not carry. Not called for mocked
   * requests since those never hit the network. */
  onRawResponse?: (response: Response) => void;
  /** Process the response as a stream. For ZIP responses, called with each
   * `{ path, content, size }` entry as it is extracted (instant unzip, no wait
   * for full download); otherwise called once with the raw ReadableStream body. */
  onStream?: (...args: any[]) => any;
  /** default=auto-detect Auto-extract ZIP responses into { data: { filename: content } }. Set false to disable. Uses archiver-web. */
  unzip?: boolean;
  /** default=auto-detect CSS selector to extract from HTML, true for full document, false to disable. Auto-parses HTML responses. Uses linkedom. */
  parseDOM?: string | boolean;
  /** default=auto-detect Unescape URL-safe HTML entities (e.g. &amp; &#39; &lt;) in text responses back to standard characters. Auto-applied when entities are detected; set false to disable, true to force. Uses convertURLSafeHTMLToHTML. */
  unescapeHTML?: boolean;
  /** default=0 Repeat request this many times */
  repeat?: number;
  /** default=null Repeat request every seconds */
  repeatEvery?: number;
  /** default=0 Seconds to debounce request, wait to execute so that other requests may override */
  debounce?: number;
  /** default=false Refetch when cache is past cacheForTime */
  regrabOnStale?: boolean;
  /** default=false Refetch on window refocus */
  regrabOnFocus?: boolean;
  /** default=false Refetch on network change */
  regrabOnNetwork?: boolean;
  /** shortcut for method: "POST" */
  post?: boolean;
  /** shortcut for method: "PUT" */
  put?: boolean;
  /** shortcut for method: "PATCH" */
  patch?: boolean;
  /** default=null The body of the POST/PUT/PATCH request (can be passed into main)*/
  body?: any;
  /** All other params become GET params, POST body, and other methods */
  [key: string]: TParams | any;
};

// & TParams

/**
 * Mock server configuration for testing.
 * @template TParams The shape of the request parameters.
 * @template TResponse The shape of the mock response data.
 */
export interface GrabMockHandler<TParams = any, TResponse = any> {
  /** Mock response data or function that returns response */
  response: TResponse | ((params: TParams) => TResponse);
  /** HTTP method this mock should respond to */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
  /** Request parameters this mock should match */
  params?: TParams;
  /** Delay in seconds before returning mock response */
  delay?: number;
}

/**
 * Request log entry for debugging and history.
 */
export interface GrabLogEntry {
  /** API path that was requested */
  path: string;
  /** Stringified request parameters */
  request: string;
  /** Response data (only present for successful requests) */
  response?: any;
  /** Error message (only present for failed requests) */
  error?: string;
  /** Timestamp when request was made */
  lastFetchTime: number;
  /** Abort controller for request cancellation */
  controller?: AbortController;
  /** Current page number for paginated requests */
  currentPage?: number;
  /** Timing, attempt and cache metadata for the latest request to this entry */
  meta?: GrabMeta;
}

/**
 * Metadata for one attempt of one grab() call. Plugins see it live on the
 * context; it is also kept on the request's `grab.log` entry. It is never
 * added to the response object, whose keys belong to the API's data.
 */
export type GrabMeta = {
  /** Trace id shared by every attempt of one grab() call */
  id: string;
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
  /** 1-based; attempt 2 is the first retry */
  attempt: number;
  /** True only when the returned data came from cache without a network round-trip */
  fromCache: boolean;
  /** hit/stale are reserved for the cache policies on the roadmap. Today
   * `cache: true` pre-fills a prior response and still refetches, which
   * reports as `revalidated`; a first request reports `miss`. */
  cacheStatus?: "hit" | "miss" | "stale" | "revalidated" | "bypass";
  /** True when this call shared another call's in-flight request */
  deduped: boolean;
  /** HTTP status, when a real response arrived */
  status?: number;
  bytesReceived?: number;
  transport: "fetch" | "undici" | "xhr" | "mock";
};

/**
 * What every plugin hook receives. Hooks may mutate it: headers and body set
 * on `init` in beforeRequest are sent, and `data` replaced in afterParse is
 * what the caller receives.
 */
export type GrabContext = {
  /** Same as meta.id */
  id: string;
  /** Path as passed to grab(), after baseURL splitting */
  path: string;
  /** Absolute or relative URL that will be fetched, query string included.
   * A plain string rather than a `Request`: relative URLs are valid in a
   * browser but cannot construct a Request in Node, Deno or Workers. */
  url: string;
  method: string;
  /** The RequestInit handed to fetch — mutate it in beforeRequest. Headers
   * are a plain object, so `ctx.init.headers["x-id"] = ctx.id` just works. */
  init: Omit<RequestInit, "headers"> & { headers: Record<string, string> };
  /** Merged options for this call (defaults, instance, per-call) */
  options: GrabOptions & { [key: string]: any };
  /** Request params (query string for GET/DELETE, JSON body for POST/PUT/PATCH) */
  params: Record<string, any>;
  attempt: number;
  /** The native Response, once one arrives. Undefined for mocked requests. */
  response?: Response;
  /** Parsed result, set before afterParse */
  data?: unknown;
  error?: GrabError;
  meta: GrabMeta;
};

type GrabHook = (ctx: GrabContext) => Promise<void> | void;

/**
 * A request-lifecycle plugin. Order per attempt:
 * beforeRequest → (transport) → afterResponse → beforeParse → (parse) →
 * afterParse → onError (on failure) → finally.
 * afterResponse and beforeParse do not run for mocked requests.
 */
export type GrabPlugin = {
  name: string;
  beforeRequest?: GrabHook;
  afterResponse?: GrabHook;
  beforeParse?: GrabHook;
  afterParse?: GrabHook;
  /** Errors thrown here are swallowed — observing a failure must not change it */
  onError?: GrabHook;
  /** Always runs once per attempt; errors thrown here are swallowed */
  finally?: GrabHook;
};

/**
 * Global grab configuration and state.
 */
export interface GrabGlobal {
  /** Default options applied to all requests */
  defaults: Partial<GrabOptions>;
  /** Request history and debugging info */
  log: GrabLogEntry[];
  /** Mock server handlers for testing */
  mock: Record<string, GrabMockHandler>;
  /** Create a separate instance of grab with separate default options */
  instance: (defaultOptions?: Partial<GrabOptions>) => GrabFunction;

  /** Feature flags for options added after the initial release, so
   * integrations can detect support instead of guessing from a version */
  supports?: GrabSupports;
}

/** Feature flags an integration can check before passing newer options. */
export type GrabSupports = {
  onRawResponse?: boolean;
  /** `plugins` option and lifecycle hooks */
  plugins?: boolean;
  /** GrabError passed as onError's fourth argument */
  grabError?: boolean;
};

/**
 * Main grab function signature with overloads for different use cases.
 */
export interface GrabFunction {
  /**
   * ### GRAB: Generate Request to API from Browser
   * ![grabAPILogo](https://i.imgur.com/RH80JGZ.png)
   * Make API request with path
   * @template TResponse The expected shape of the response data.
   * @template TParams The shape of the request parameters.
   * @param path The full URL path OR relative path on this server
   * @param options Request params and utility options
   * @returns {Promise<Object>} The response object with resulting data or .error if error.
   * @author [vtempest (2025)](https://github.com/vtempest/GRAB-URL)
   * @see  [🎯 Examples](https://grab.js.org/docs/Examples) [📑 Docs](https://grab.js.org/lib)
   */
  <TResponse = any, TParams = Record<string, any>>(
    path: string,
    options?: GrabOptions<TResponse, TParams>,
  ): Promise<GrabResponse<TResponse>>;

  /**
   * ### GRAB: Generate Request to API from Browser
   * ![grabAPILogo](https://i.imgur.com/RH80JGZ.png)
   * Make API request with path and options/parameters
   * @template TResponse The expected shape of the response data.
   * @template TParams The shape of the request parameters.
   * @param path The full URL path OR relative path on this server
   * @param config Request configuration and utility options
   * @returns {Promise<Object>} The response object with resulting data or .error if error.
   * @author [vtempest (2025)](https://github.com/vtempest/GRAB-URL)
   * @see  [🎯 Examples](https://grab.js.org/docs/Examples) [📑 Docs](https://grab.js.org/lib)
   */
  <TResponse = any, TParams = Record<string, any>>(
    path: string,
    config: GrabOptions<TResponse, TParams>,
  ): Promise<GrabResponse<TResponse>>;

  /** Default options applied to all requests */
  defaults: Partial<GrabOptions>;

  /** Request history and debugging info for all requests */
  log: GrabLogEntry[];

  /** Mock server handlers for testing */
  mock: Record<string, GrabMockHandler>;

  /** Create a separate instance of grab with separate default options */
  instance: (defaultOptions?: Partial<GrabOptions>) => GrabFunction;

  /** Feature flags for options added after the initial release, so
   * integrations can detect support instead of guessing from a version */
  supports?: GrabSupports;
}

/**
 * Log function for debugging.
 */
export interface LogFunction {
  /**
   * Log messages with custom styling
   * @param message - Message to log (string or object)
   * @param options - Styling and control options
   */
  (message: string | object, options?: LogOptions): void;
}

/**
 * Utility function to describe JSON structure.
 */
export interface printJSONStructureFunction {
  /**
   * Generate TypeDoc-like description of JSON object structure
   * @param obj - The JSON object to describe
   * @returns String representation of object structure
   */
  (obj: any): string;
}

declare global {
  /** Browser globals for grab and log */
  interface Window {
    /** Global grab function */
    grab: GrabFunction;
  }

  /** Node.js/GlobalThis globals for grab and log */
  var grab: GrabFunction;
}
