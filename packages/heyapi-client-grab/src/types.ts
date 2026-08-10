/**
 * @file types.ts
 * @description Type contract for the Hey API client interface, implemented on
 * top of grab(). These mirror the shapes `@hey-api/openapi-ts` generates
 * against, so generated SDKs type-check unchanged when this client is swapped
 * in for `@hey-api/client-fetch` or `@hey-api/client-axios`.
 */

import type { GrabFunction } from "grab-url";

/** Return only `data`, or the full `{ data, error, request, response }` set. */
export type ResponseStyle = "data" | "fields";

/** Resolved auth value, or undefined when the scheme has no token. */
export type AuthToken = string | undefined;

/** A single security scheme entry from the OpenAPI spec. */
export interface Auth {
  /** Which part of the request carries the token. default="header" */
  in?: "header" | "query" | "cookie";
  /** Header or query parameter name. default="Authorization" */
  name?: string;
  /** HTTP auth scheme, which decides the `Bearer `/`Basic ` prefix. */
  scheme?: "basic" | "bearer";
  /** Security scheme type. */
  type: "apiKey" | "http";
}

/** Serializes the `query` object into a URL search string. */
export type QuerySerializer = (query: Record<string, unknown>) => string;

/** Serializes the request body into whatever the transport should send. */
export type BodySerializer = (body: any) => any;

/** Explode/style pair from the OpenAPI serialization rules. */
export interface SerializerOptions<T> {
  /** default=true */
  explode: boolean;
  style: T;
}

export type ArrayStyle = "form" | "spaceDelimited" | "pipeDelimited";
export type ObjectStyle = "form" | "deepObject";
export type MatrixStyle = "label" | "matrix" | "simple";
export type ArraySeparatorStyle = ArrayStyle | MatrixStyle;
export type ObjectSeparatorStyle = ObjectStyle | MatrixStyle;

/** Per-kind overrides for the built-in query serializer. */
export interface QuerySerializerOptions {
  allowReserved?: boolean;
  array?: SerializerOptions<ArrayStyle>;
  object?: SerializerOptions<ObjectStyle>;
}

/** Options a generated SDK may narrow through its `ClientOptions` type. */
export interface ClientOptions {
  baseUrl?: string;
  responseStyle?: ResponseStyle;
  throwOnError?: boolean;
}

/**
 * grab() options this client forwards on every request. They are what you get
 * from this client that a plain fetch client cannot do: caching, retries,
 * rate limiting, deduplication, timeouts and the shared request log.
 * @see https://grab.js.org/docs/grab-options
 */
export interface GrabConfig {
  /** Custom grab function, e.g. `grab.instance({ baseURL })`. default=grab */
  grab?: GrabFunction;
  /** default=false Serve from grab's frontend cache when still fresh */
  cache?: boolean;
  /** default=60 Seconds until a cached response is considered stale */
  cacheForTime?: number;
  /** default=30 Seconds before the request is aborted */
  timeout?: number;
  /** default=0 Retry a failed request this many times */
  retryAttempts?: number;
  /** default=0 Seconds to wait between requests to the same path */
  rateLimit?: number;
  /** default=false Abort an in-flight request to the same path */
  cancelOngoingIfNew?: boolean;
  /** default=false Skip this request if one to the same path is in flight */
  cancelNewIfOngoing?: boolean;
  /** default=true on localhost Log requests and responses */
  debug?: boolean;
  /** default=log Custom logger replacing the built-in color JSON log() */
  logger?: (...args: any[]) => void;
  /** default=false Let grab auto-extract ZIP responses into `{ filename: content }` */
  unzip?: boolean;
  /** default=false CSS selector to extract from HTML responses, or true for the full document */
  parseDOM?: string | boolean;
  /** default=false Unescape HTML entities in text responses */
  unescapeHTML?: boolean;
}

/** Client-wide configuration, also accepted per request. */
export interface Config<T extends ClientOptions = ClientOptions>
  // `cache` is omitted because grab owns caching: it is a boolean here, not
  // the fetch RequestCache enum.
  extends Omit<RequestInit, "body" | "cache" | "headers" | "method">,
    GrabConfig {
  /**
   * Auth token, or a function returning one. The resolved value is placed
   * where the endpoint's `security` array says it belongs.
   */
  auth?: ((auth: Auth) => Promise<AuthToken> | AuthToken) | AuthToken;
  /** Base URL prefixed to every request path. */
  baseUrl?: T["baseUrl"];
  /** default=JSON.stringify Serializer for the request body. */
  bodySerializer?: BodySerializer | null;
  /** Headers to pre-populate every request with. */
  headers?:
    | RequestInit["headers"]
    | Record<
        string,
        | string
        | number
        | boolean
        | (string | number | boolean)[]
        | null
        | undefined
        | unknown
      >;
  /** The HTTP method. */
  method?:
    | "CONNECT"
    | "DELETE"
    | "GET"
    | "HEAD"
    | "OPTIONS"
    | "PATCH"
    | "POST"
    | "PUT"
    | "TRACE";
  /**
   * default='auto' How to read the response body. `auto` infers it from the
   * Content-Type header. Anything other than `stream` is read by grab.
   */
  parseAs?: Exclude<keyof Body, "body" | "bodyUsed"> | "auto" | "stream";
  /**
   * default=deepObject/form Serializer for query parameters, or the options
   * for the built-in one.
   */
  querySerializer?: QuerySerializer | QuerySerializerOptions;
  /** default='fields' Return only data, or data plus request/response/error. */
  responseStyle?: T["responseStyle"];
  /** Transform parsed JSON before it is returned, e.g. to revive dates. */
  responseTransformer?: (data: unknown) => Promise<unknown>;
  /** Validate parsed JSON before it is returned. */
  responseValidator?: (data: unknown) => Promise<unknown>;
  /** default=false Throw errors instead of returning them. */
  throwOnError?: T["throwOnError"];
}

/** A fully specified single request. */
export interface RequestOptions<
  TResponseStyle extends ResponseStyle = "fields",
  ThrowOnError extends boolean = boolean,
  Url extends string = string,
> extends Config<{
    responseStyle: TResponseStyle;
    throwOnError: ThrowOnError;
  }> {
  /** Request body, serialized with `bodySerializer`. */
  body?: unknown;
  /** Values for `{placeholders}` in the url. */
  path?: Record<string, unknown>;
  /** Query parameters. */
  query?: Record<string, unknown>;
  /** Security schemes to satisfy for this request. */
  security?: ReadonlyArray<Auth>;
  /** Path template, appended to `baseUrl`. */
  url: Url;
}

/** What a request resolves to, shaped by `throwOnError` and `responseStyle`. */
export type RequestResult<
  TData = unknown,
  TError = unknown,
  ThrowOnError extends boolean = boolean,
  TResponseStyle extends ResponseStyle = "fields",
> = ThrowOnError extends true
  ? Promise<
      TResponseStyle extends "data"
        ? TData extends Record<string, unknown>
          ? TData[keyof TData]
          : TData
        : {
            data: TData extends Record<string, unknown>
              ? TData[keyof TData]
              : TData;
            request: Request;
            response: Response;
          }
    >
  : Promise<
      TResponseStyle extends "data"
        ?
            | (TData extends Record<string, unknown>
                ? TData[keyof TData]
                : TData)
            | undefined
        : (
            | {
                data: TData extends Record<string, unknown>
                  ? TData[keyof TData]
                  : TData;
                error: undefined;
              }
            | {
                data: undefined;
                error: TError extends Record<string, unknown>
                  ? TError[keyof TError]
                  : TError;
              }
          ) & {
            request: Request;
            response: Response;
          }
    >;

/** The per-endpoint data shape generated SDKs pass around. */
export interface TDataShape {
  body?: unknown;
  headers?: unknown;
  path?: unknown;
  query?: unknown;
  url: string;
}

type OmitKeys<T, K> = Pick<T, Exclude<keyof T, K>>;

/** Options a generated SDK function accepts for one endpoint. */
export type Options<
  TData extends TDataShape = TDataShape,
  ThrowOnError extends boolean = boolean,
  TResponseStyle extends ResponseStyle = "fields",
> = OmitKeys<
  RequestOptions<TResponseStyle, ThrowOnError>,
  "body" | "path" | "query" | "url"
> &
  Omit<TData, "url">;

/** Options shape produced by the legacy (pre-`TDataShape`) SDK parser. */
export type OptionsLegacyParser<
  TData = unknown,
  ThrowOnError extends boolean = boolean,
  TResponseStyle extends ResponseStyle = "fields",
> = TData extends { body?: any }
  ? TData extends { headers?: any }
    ? OmitKeys<
        RequestOptions<TResponseStyle, ThrowOnError>,
        "body" | "headers" | "url"
      > &
        TData
    : OmitKeys<RequestOptions<TResponseStyle, ThrowOnError>, "body" | "url"> &
        TData &
        Pick<RequestOptions<TResponseStyle, ThrowOnError>, "headers">
  : TData extends { headers?: any }
    ? OmitKeys<
        RequestOptions<TResponseStyle, ThrowOnError>,
        "headers" | "url"
      > &
        TData &
        Pick<RequestOptions<TResponseStyle, ThrowOnError>, "body">
    : OmitKeys<RequestOptions<TResponseStyle, ThrowOnError>, "url"> & TData;

type ErrInterceptor<Err, Res, Req, Options> = (
  error: Err,
  response: Res,
  request: Req,
  options: Options,
) => Err | Promise<Err>;

type ReqInterceptor<Req, Options> = (
  request: Req,
  options: Options,
) => Req | Promise<Req>;

type ResInterceptor<Res, Req, Options> = (
  response: Res,
  request: Req,
  options: Options,
) => Res | Promise<Res>;

/** Registered interceptor with `use()`/`eject()` but no internals exposed. */
export interface InterceptorHandlers<Interceptor> {
  eject: (id: number | Interceptor) => void;
  use: (fn: Interceptor) => number;
}

/** The `client.interceptors` surface. */
export interface Middleware<Req, Res, Err, Options> {
  error: InterceptorHandlers<ErrInterceptor<Err, Res, Req, Options>>;
  request: InterceptorHandlers<ReqInterceptor<Req, Options>>;
  response: InterceptorHandlers<ResInterceptor<Res, Req, Options>>;
}

type MethodFn = <
  TData = unknown,
  TError = unknown,
  ThrowOnError extends boolean = false,
  TResponseStyle extends ResponseStyle = "fields",
>(
  options: Omit<RequestOptions<TResponseStyle, ThrowOnError>, "method">,
) => RequestResult<TData, TError, ThrowOnError, TResponseStyle>;

type RequestFn = <
  TData = unknown,
  TError = unknown,
  ThrowOnError extends boolean = false,
  TResponseStyle extends ResponseStyle = "fields",
>(
  options: Omit<RequestOptions<TResponseStyle, ThrowOnError>, "method"> &
    Pick<Required<RequestOptions<TResponseStyle, ThrowOnError>>, "method">,
) => RequestResult<TData, TError, ThrowOnError, TResponseStyle>;

type BuildUrlFn = <
  TData extends {
    body?: unknown;
    path?: Record<string, unknown>;
    query?: Record<string, unknown>;
    url: string;
  },
>(
  options: Pick<TData, "url"> & Options<TData>,
) => string;

/** The client object generated SDKs call into. */
export interface Client {
  /** Returns the final request URL without sending anything. */
  buildUrl: BuildUrlFn;
  connect: MethodFn;
  delete: MethodFn;
  get: MethodFn;
  getConfig: () => Config;
  head: MethodFn;
  interceptors: Middleware<Request, Response, unknown, RequestOptions>;
  options: MethodFn;
  patch: MethodFn;
  post: MethodFn;
  put: MethodFn;
  request: RequestFn;
  setConfig: (config: Config) => Config;
  trace: MethodFn;
}

/**
 * Called on client initialization; the returned object becomes the client's
 * starting configuration. Useful when a value has to be resolved per
 * environment instead of at module load.
 */
export type CreateClientConfig<T extends ClientOptions = ClientOptions> = (
  override?: Config<ClientOptions & T>,
) => Config<Required<ClientOptions> & T>;
