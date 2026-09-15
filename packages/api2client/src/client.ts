/**
 * @file client.ts
 * @description The Hey API client interface implemented on top of grab().
 * Generated SDKs call `client.get()`, `client.post()` and friends; every one
 * of those calls is sent by grab, so an OpenAPI SDK inherits grab's caching,
 * retries, rate limiting, deduplication, mock server and request log instead
 * of axios' or fetch's bare behavior.
 */

import { grab as defaultGrab, isLocalhost, setupDevTools } from "grab-url/slim";
import type { GrabOptions } from "grab-url/slim";

import { createSseClient } from "./core/sse";
import type { Client, Config, RequestOptions, ResponseStyle } from "./types";
import {
  buildUrl,
  createConfig,
  createInterceptors,
  getParseAs,
  mergeConfigs,
  mergeHeaders,
  setAuthParams,
} from "./utils";

/** Stand-in Response for answers that never touched the network, e.g. mocks. */
const mockedResponse = () =>
  new Response(null, {
    status: 200,
    statusText: "OK",
    headers: { "Content-Type": "application/json" },
  });

/** Turns a Headers object into the plain record grab expects. */
const headersToRecord = (headers: Headers): Record<string, string> => {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
};

/** A grab result is a failure when it carries an error and never got data. */
const isGrabError = (result: any): boolean =>
  !!result && result.data === undefined && typeof result.error === "string";

/** Statuses and headers that promise a body-less response. */
const isEmptyResponse = (response: Response) =>
  response.status === 204 ||
  response.status === 205 ||
  response.status === 304 ||
  response.headers.get("Content-Length") === "0";

/** The empty value each parse mode yields when there is no body to read. */
const emptyData = (parseAs: Config["parseAs"]) => {
  switch (parseAs) {
    case "arrayBuffer":
      return new ArrayBuffer(0);
    case "blob":
      return new Blob([]);
    case "formData":
      return new FormData();
    case "text":
      return "";
    case "stream":
      return null;
    default:
      return {};
  }
};

/**
 * Whether the installed grab reports the `onRawResponse` hook, added in
 * grab-url 1.6.23. Instances made with `grab.instance()` do not carry the
 * flag, so the imported grab answers for the library as a whole.
 *
 * Without it the client still works, but a failed request reports grab's
 * error message instead of the response status and parsed error payload.
 */
const supportsRawResponse = (grab: any): boolean =>
  (grab?.supports ?? (defaultGrab as any)?.supports)?.onRawResponse === true;

/** Drops unset entries so grab never receives `undefined` as a value. */
const defined = <T extends Record<string, any>>(options: T): T => {
  for (const key of Object.keys(options))
    if (options[key] === undefined) delete options[key];
  return options;
};

/**
 * Methods whose answer may be reused and whose failure may be replayed, and so
 * the only ones a client-wide `cache` or `retryAttempts` reaches.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** RequestInit fields carried over from the config, minus grab's own options. */
const toRequestInit = (opts: Record<string, any>): RequestInit => ({
  credentials: opts.credentials,
  integrity: opts.integrity,
  keepalive: opts.keepalive,
  mode: opts.mode,
  redirect: opts.redirect ?? "follow",
  referrer: opts.referrer,
  referrerPolicy: opts.referrerPolicy,
  signal: opts.signal,
});

/**
 * Attaches grab's Ctrl+Alt+I request inspector to this client.
 *
 * grab records its log on the *global* grab (`window.grab.log`) and the
 * inspector reads it from there, so an SDK whose only reference to grab is
 * this module's import has to publish one — otherwise the modal opens onto an
 * empty log and the SDK's requests never show up.
 *
 * Only on a loopback host, which is where grab installs its own shortcut: a
 * public origin is someone's production site, and every request an SDK made is
 * not something to hand its visitors a keystroke away. `devtools: true` turns
 * it on anyway, for debugging a deployed build.
 *
 * @param grab - The grab this client sends with, published if none is global.
 */
const attachDevTools = (grab: any) => {
  if (typeof window === "undefined") return;

  const scope = window as any;
  // An app that imported grab itself already owns the global, and the log the
  // inspector has been showing all along; only fill in a missing one.
  if (!scope.grab?.log) scope.grab = grab?.log ? grab : defaultGrab;

  // setupDevTools() guards itself against a second call, but an older grab
  // does not; the flag keeps either from registering the listener twice.
  if (scope.__grabDevToolsAttached) return;
  scope.__grabDevToolsAttached = true;
  setupDevTools();
};

/**
 * Creates a Hey API client that sends every request through grab.
 *
 * @param config - Client-wide defaults, also settable later with `setConfig()`.
 * @returns A client that generated SDKs can be pointed at.
 * @example
 * const client = createClient(createConfig({
 *   baseUrl: "https://api.example.com",
 *   cache: true,
 *   retryAttempts: 2,
 * }));
 */
export const createClient = (config: Config = {}): Client => {
  let _config = mergeConfigs(createConfig(), config);

  // Unset means "when developing"; `true` and `false` both override that.
  if (_config.devtools ?? isLocalhost())
    attachDevTools(_config.grab ?? defaultGrab);

  const getConfig = (): Config => ({ ..._config });

  const setConfig = (config: Config): Config => {
    _config = mergeConfigs(_config, config);
    return getConfig();
  };

  const interceptors = createInterceptors<
    Request,
    Response,
    unknown,
    RequestOptions
  >();

  const request: Client["request"] = async (options) => {
    const opts = {
      ..._config,
      ...options,
      headers: mergeHeaders(_config.headers, options.headers),
    };

    if (opts.security) await setAuthParams({ ...opts, security: opts.security });

    let body = opts.body;
    if (body !== undefined && opts.bodySerializer) body = opts.bodySerializer(body);

    // Drop the Content-Type header when there is nothing to describe, so an
    // empty POST does not claim to be sending JSON.
    if (body === undefined || body === "") opts.headers.delete("Content-Type");

    // Merging a client Config with per-request options widens the literal
    // types the generic signature narrows; interceptors take the plain shape.
    const requestOptions = opts as unknown as RequestOptions;

    // The Request is what actually gets sent: interceptors may rewrite its
    // url, method, headers or body, and grab is handed the result.
    let request = new Request(buildUrl(requestOptions), {
      ...toRequestInit(opts),
      body: (body ?? null) as BodyInit | null,
      headers: opts.headers,
      method: opts.method,
    });

    for (const fn of interceptors.request._fns)
      if (fn) request = await fn(request, requestOptions);

    const throwOnError = opts.throwOnError ?? false;
    const responseStyle: ResponseStyle = opts.responseStyle ?? "fields";
    const grab = opts.grab ?? defaultGrab;
    // Serving a write from cache, or replaying one that failed, would change
    // what the API was asked to do, so a client-wide `cache`/`retryAttempts`
    // covers reads only. A caller who wants either on a write says so on that
    // request, where the consequences are in front of them.
    const safe = SAFE_METHODS.has(request.method);
    const cache = safe ? opts.cache : (options.cache ?? false);
    const retryAttempts = safe
      ? opts.retryAttempts
      : (options.retryAttempts ?? 0);
    const hasBody =
      (body !== undefined && body !== null && body !== "") || !!request.body;

    // Split the base back off so grab keys its log, cache and mock server by
    // path — `grab.mock["/pets"]` rather than the whole absolute url. A
    // request interceptor that rewrote the url falls back to the full url.
    const base = (opts.baseUrl as string) || "";
    const baseURL = base && request.url.startsWith(base) ? base : "";
    const path = baseURL ? request.url.slice(baseURL.length) : request.url;

    let response: Response | undefined;
    let errorBody: Promise<string> | undefined;
    let stream: ReadableStream | null = null;

    const grabResult: any = await grab(path, defined({
      method: request.method as GrabOptions["method"],
      headers: headersToRecord(request.headers),
      // Send the bytes the Request holds so a multipart boundary keeps
      // matching its header, and so `null` means "no body" rather than "{}".
      body: hasBody ? await request.clone().arrayBuffer() : null,
      baseURL,
      cache,
      timeout: opts.timeout,
      rateLimit: opts.rateLimit,
      unzip: opts.unzip ?? false,
      cancelOngoingIfNew: opts.cancelOngoingIfNew,
      cancelNewIfOngoing: opts.cancelNewIfOngoing,
      debug: opts.debug,
      logger: opts.logger,
      // Reading the stream is the caller's job when they asked for one.
      ...(opts.parseAs === "stream"
        ? { onStream: (body: ReadableStream) => void (stream = body) }
        : {}),
      // Options a pre-1.6.23 grab does not know about would be serialized
      // into the query string, so they are only sent when it can handle them.
      ...(supportsRawResponse(grab)
        ? {
            // Body handling belongs to the OpenAPI contract, so grab's HTML
            // post-processing stays off unless it was asked for explicitly.
            parseDOM: opts.parseDOM ?? false,
            unescapeHTML: opts.unescapeHTML ?? false,
            cacheForTime: opts.cacheForTime,
            retryAttempts,
            onRawResponse: (raw: Response) => {
              response = raw;
              // grab throws on a failed status without touching the body, so
              // it is still ours to read for the error payload.
              if (!raw.ok) errorBody = raw.text().catch(() => "");
            },
          }
        : {}),
    }));

    if (response)
      for (const fn of interceptors.response._fns)
        if (fn) response = await fn(response, request, requestOptions);

    const parseAs =
      (opts.parseAs && opts.parseAs !== "auto"
        ? opts.parseAs
        : response && getParseAs(response.headers.get("Content-Type"))) ??
      "json";

    let error: unknown;
    let data: unknown;

    if (!response) {
      // Nothing went over the wire: either a grab mock answered, or the
      // request never left (timeout, abort, rate limit, connection failure).
      if (isGrabError(grabResult)) error = grabResult.error;
      else if (grabResult?.isLoading && grabResult.data === undefined)
        // cancelNewIfOngoing dropped this one in favor of a request in flight.
        error = `Skipped ${path}: a request to the same path is already in progress`;
      else {
        data = grabResult?.data ?? grabResult;
        response = mockedResponse();
      }
    } else if (!response.ok) {
      const text = (await errorBody) ?? "";
      try {
        error = JSON.parse(text);
      } catch {
        error = text;
      }
    } else if (isEmptyResponse(response)) {
      // A body-less response carries no Content-Type to infer from, so only an
      // explicit parseAs decides the shape of "nothing".
      data = emptyData(
        opts.parseAs && opts.parseAs !== "auto" ? opts.parseAs : "json",
      );
    } else if (parseAs === "stream") {
      data = stream;
    } else if (isGrabError(grabResult)) {
      // The status was fine but the body could not be read.
      error = grabResult.error;
    } else {
      data = grabResult?.data;
    }

    if (error === undefined) {
      if (parseAs === "json") {
        if (opts.responseValidator) await opts.responseValidator(data);
        if (opts.responseTransformer) data = await opts.responseTransformer(data);
      }

      return (responseStyle === "data"
        ? data
        : { data, request, response }) as any;
    }

    for (const fn of interceptors.error._fns)
      if (fn) error = await fn(error, response!, request, requestOptions);

    error = error || {};

    if (throwOnError) throw error;

    return (responseStyle === "data"
      ? undefined
      : { error, request, response }) as any;
  };

  // SSE opens a long-lived connection, so it goes straight through fetch
  // rather than grab — grab's cache/retry/timeout model is built around a
  // request that completes, not one that stays open and gets reconnected.
  const makeSse =
    (method: NonNullable<Config["method"]>): Client["sse"]["connect"] =>
    async (options) => {
      const opts = {
        ..._config,
        ...options,
        headers: mergeHeaders(_config.headers, options.headers),
      };

      if (opts.security) await setAuthParams({ ...opts, security: opts.security });

      let serializedBody: BodyInit | undefined;
      if (opts.body !== undefined && opts.bodySerializer)
        serializedBody = opts.bodySerializer(opts.body);
      if (opts.body === undefined || serializedBody === "")
        opts.headers.delete("Content-Type");

      const requestOptions = { ...opts, method } as unknown as RequestOptions;
      const url = buildUrl(requestOptions);

      return createSseClient({
        ...toRequestInit(opts),
        fetch: opts.fetch,
        headers: opts.headers,
        method,
        onRequest: async (reqUrl, init) => {
          let sseRequest = new Request(reqUrl, init);
          for (const fn of interceptors.request._fns)
            if (fn) sseRequest = await fn(sseRequest, requestOptions);
          return sseRequest;
        },
        onSseError: opts.onSseError,
        onSseEvent: opts.onSseEvent,
        responseTransformer: opts.responseTransformer,
        responseValidator: opts.responseValidator,
        serializedBody,
        sseDefaultRetryDelay: opts.sseDefaultRetryDelay,
        sseMaxRetryAttempts: opts.sseMaxRetryAttempts,
        sseMaxRetryDelay: opts.sseMaxRetryDelay,
        sseSleepFn: opts.sseSleepFn,
        url,
      });
    };

  return {
    buildUrl: (options) => buildUrl({ ..._config, ...options } as any),
    connect: (options) => request({ ...options, method: "CONNECT" }),
    delete: (options) => request({ ...options, method: "DELETE" }),
    get: (options) => request({ ...options, method: "GET" }),
    getConfig,
    head: (options) => request({ ...options, method: "HEAD" }),
    interceptors,
    options: (options) => request({ ...options, method: "OPTIONS" }),
    patch: (options) => request({ ...options, method: "PATCH" }),
    post: (options) => request({ ...options, method: "POST" }),
    put: (options) => request({ ...options, method: "PUT" }),
    request,
    setConfig,
    sse: {
      connect: makeSse("CONNECT"),
      delete: makeSse("DELETE"),
      get: makeSse("GET"),
      head: makeSse("HEAD"),
      options: makeSse("OPTIONS"),
      patch: makeSse("PATCH"),
      post: makeSse("POST"),
      put: makeSse("PUT"),
      trace: makeSse("TRACE"),
    },
    trace: (options) => request({ ...options, method: "TRACE" }),
  };
};
