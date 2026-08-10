/**
 * @file client.ts
 * @description The Hey API client interface implemented on top of grab().
 * Generated SDKs call `client.get()`, `client.post()` and friends; every one
 * of those calls is sent by grab, so an OpenAPI SDK inherits grab's caching,
 * retries, rate limiting, deduplication, mock server and request log instead
 * of axios' or fetch's bare behavior.
 */

import { grab as defaultGrab } from "grab-url";
import type { GrabOptions } from "grab-url";

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
      cache: opts.cache,
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
            retryAttempts: opts.retryAttempts,
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
    trace: (options) => request({ ...options, method: "TRACE" }),
  };
};
