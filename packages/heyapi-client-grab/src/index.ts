/**
 * @file index.ts
 * @description Public entry point: a Hey API client powered by grab, plus the
 * serializers and helpers generated SDKs import alongside it.
 * @see https://grab.js.org/docs/openapi-services/heyapi-client-grab
 */

export { createClient } from "./client";
export { getAuthToken } from "./core/auth";
export {
  formDataBodySerializer,
  jsonBodySerializer,
  urlSearchParamsBodySerializer,
} from "./core/body-serializer";
export { buildClientParams } from "./core/params";
export type { Field, Fields, FieldsConfig } from "./core/params";
export {
  serializeArrayParam,
  serializeObjectParam,
  serializePrimitiveParam,
} from "./core/path-serializer";
export { generateFromOpenAPI, rewireGeneratedClient } from "./generate";
export type { GenerateOptions, GenerateResult } from "./generate";
export type {
  ArrayStyle,
  Auth,
  AuthToken,
  BodySerializer,
  Client,
  ClientOptions,
  Config,
  CreateClientConfig,
  GrabConfig,
  Middleware,
  ObjectStyle,
  Options,
  OptionsLegacyParser,
  QuerySerializer,
  QuerySerializerOptions,
  RequestOptions,
  RequestResult,
  ResponseStyle,
  SerializerOptions,
  TDataShape,
} from "./types";
export {
  buildUrl,
  createConfig,
  createQuerySerializer,
  getParseAs,
  getUrl,
  mergeConfigs,
  mergeHeaders,
  setAuthParams,
} from "./utils";
