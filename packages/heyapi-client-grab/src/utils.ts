/**
 * @file utils.ts
 * @description Config merging, URL building, auth placement and interceptor
 * plumbing shared by the client. Mirrors the helpers Hey API clients expose so
 * generated code and user code can import them from here unchanged.
 */

import { getAuthToken } from "./core/auth";
import { jsonBodySerializer } from "./core/body-serializer";
import {
  defaultPathSerializer,
  serializeArrayParam,
  serializeObjectParam,
  serializePrimitiveParam,
} from "./core/path-serializer";
import type {
  Client,
  ClientOptions,
  Config,
  QuerySerializer,
  QuerySerializerOptions,
  RequestOptions,
} from "./types";

/** Builds a query serializer honoring the given array/object style options. */
export const createQuerySerializer = <T = unknown>({
  allowReserved,
  array,
  object,
}: QuerySerializerOptions = {}) => {
  const querySerializer = (queryParams: T) => {
    const search: string[] = [];
    if (queryParams && typeof queryParams === "object") {
      for (const name in queryParams) {
        const value = queryParams[name];
        if (value === undefined || value === null) continue;

        if (Array.isArray(value)) {
          const serializedArray = serializeArrayParam({
            allowReserved,
            explode: true,
            name,
            style: "form",
            value,
            ...array,
          });
          if (serializedArray) search.push(serializedArray);
        } else if (typeof value === "object") {
          const serializedObject = serializeObjectParam({
            allowReserved,
            explode: true,
            name,
            style: "deepObject",
            value: value as Record<string, unknown>,
            ...object,
          });
          if (serializedObject) search.push(serializedObject);
        } else {
          const serializedPrimitive = serializePrimitiveParam({
            allowReserved,
            name,
            value: value as string,
          });
          if (serializedPrimitive) search.push(serializedPrimitive);
        }
      }
    }
    return search.join("&");
  };
  return querySerializer;
};

/**
 * Infers how to read a response body from its Content-Type header.
 *
 * @param contentType - Value of the Content-Type response header.
 * @returns The matching body method, or undefined when nothing fits.
 */
export const getParseAs = (
  contentType: string | null,
): Exclude<Config["parseAs"], "auto"> => {
  // Without a Content-Type the best we can do is hand back the raw body.
  if (!contentType) return "stream";

  const cleanContent = contentType.split(";")[0]?.trim();
  if (!cleanContent) return;

  if (
    cleanContent.startsWith("application/json") ||
    cleanContent.endsWith("+json")
  )
    return "json";

  if (cleanContent === "multipart/form-data") return "formData";

  if (
    ["application/", "audio/", "image/", "video/"].some((type) =>
      cleanContent.startsWith(type),
    )
  )
    return "blob";

  if (cleanContent.startsWith("text/")) return "text";
};

/** Places resolved auth tokens into the header, query or cookie they belong in. */
export const setAuthParams = async ({
  security,
  ...options
}: Pick<Required<RequestOptions>, "security"> &
  Pick<RequestOptions, "auth" | "query"> & { headers: Headers }) => {
  for (const auth of security) {
    const token = await getAuthToken(auth, options.auth);
    if (!token) continue;

    const name = auth.name ?? "Authorization";

    switch (auth.in) {
      case "query":
        if (!options.query) options.query = {};
        options.query[name] = token;
        break;
      case "cookie":
        options.headers.append("Cookie", `${name}=${token}`);
        break;
      case "header":
      default:
        options.headers.set(name, token);
        break;
    }

    return;
  }
};

/** Joins baseUrl, path placeholders and query into the final request URL. */
export const getUrl = ({
  baseUrl,
  path,
  query,
  querySerializer,
  url: _url,
}: {
  baseUrl?: string;
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  querySerializer: QuerySerializer;
  url: string;
}) => {
  const pathUrl = _url.startsWith("/") ? _url : `/${_url}`;
  let url = (baseUrl ?? "") + pathUrl;

  if (path) url = defaultPathSerializer({ path, url });

  let search = query ? querySerializer(query) : "";
  if (search.startsWith("?")) search = search.substring(1);
  if (search) url += `?${search}`;

  return url;
};

/** Returns the final request URL for the given options. */
export const buildUrl: Client["buildUrl"] = (options) =>
  getUrl({
    baseUrl: options.baseUrl as string,
    path: options.path,
    query: options.query,
    querySerializer:
      typeof options.querySerializer === "function"
        ? options.querySerializer
        : createQuerySerializer(options.querySerializer),
    url: options.url,
  });

/** Merges two configs, normalizing baseUrl and combining headers. */
export const mergeConfigs = (a: Config, b: Config): Config => {
  const config = { ...a, ...b };
  if (config.baseUrl?.endsWith("/"))
    config.baseUrl = config.baseUrl.substring(0, config.baseUrl.length - 1);
  config.headers = mergeHeaders(a.headers, b.headers);
  return config;
};

/**
 * Merges header sources left to right. A null value deletes the header, an
 * array appends each entry, and an object value is JSON stringified.
 */
export const mergeHeaders = (
  ...headers: Array<Required<Config>["headers"] | undefined>
): Headers => {
  const mergedHeaders = new Headers();

  for (const header of headers) {
    if (!header || typeof header !== "object") continue;

    const iterator =
      header instanceof Headers ? header.entries() : Object.entries(header);

    for (const [key, value] of iterator) {
      if (value === null) {
        mergedHeaders.delete(key);
      } else if (Array.isArray(value)) {
        for (const v of value) mergedHeaders.append(key, v as string);
      } else if (value !== undefined) {
        // Object header values are JSON stringified, matching an
        // `application/json` content type in the OpenAPI specification.
        mergedHeaders.set(
          key,
          typeof value === "object" ? JSON.stringify(value) : (value as string),
        );
      }
    }
  }

  return mergedHeaders;
};

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

/** Ordered interceptor list, with ejected slots left as null to keep ids stable. */
class Interceptors<Interceptor> {
  _fns: (Interceptor | null)[];

  constructor() {
    this._fns = [];
  }

  /** Alias used by newer generated clients, which read `.fns`. */
  get fns() {
    return this._fns;
  }

  clear() {
    this._fns = [];
  }

  getInterceptorIndex(id: number | Interceptor): number {
    if (typeof id === "number") return this._fns[id] ? id : -1;
    return this._fns.indexOf(id);
  }

  exists(id: number | Interceptor) {
    return !!this._fns[this.getInterceptorIndex(id)];
  }

  eject(id: number | Interceptor) {
    const index = this.getInterceptorIndex(id);
    if (this._fns[index]) this._fns[index] = null;
  }

  update(id: number | Interceptor, fn: Interceptor) {
    const index = this.getInterceptorIndex(id);
    if (!this._fns[index]) return false;
    this._fns[index] = fn;
    return id;
  }

  use(fn: Interceptor) {
    this._fns = [...this._fns, fn];
    return this._fns.length - 1;
  }
}

// Return type is left inferred so the client can reach `_fns` internally
// while the public `Middleware` type keeps it hidden.
export const createInterceptors = <Req, Res, Err, Options>() => ({
  error: new Interceptors<ErrInterceptor<Err, Res, Req, Options>>(),
  request: new Interceptors<ReqInterceptor<Req, Options>>(),
  response: new Interceptors<ResInterceptor<Res, Req, Options>>(),
});

const defaultQuerySerializer = createQuerySerializer({
  allowReserved: false,
  array: { explode: true, style: "form" },
  object: { explode: true, style: "deepObject" },
});

const defaultHeaders = { "Content-Type": "application/json" };

/**
 * Builds the client's starting configuration, with the JSON body serializer,
 * the OpenAPI-compliant query serializer and Content-Type header applied
 * unless overridden.
 *
 * @param override - Options replacing the defaults.
 * @returns The resolved config to hand to {@link createClient}.
 */
export const createConfig = <T extends ClientOptions = ClientOptions>(
  override: Config<Omit<ClientOptions, keyof T> & T> = {},
): Config<Omit<ClientOptions, keyof T> & T> => ({
  ...jsonBodySerializer,
  headers: defaultHeaders,
  parseAs: "auto",
  querySerializer: defaultQuerySerializer,
  ...override,
});
