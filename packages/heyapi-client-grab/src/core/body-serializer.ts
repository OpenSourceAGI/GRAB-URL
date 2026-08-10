/**
 * @file core/body-serializer.ts
 * @description Request body serializers generated SDKs import by name for
 * `multipart/form-data` and `application/x-www-form-urlencoded` endpoints.
 * Ported from Hey API's client core (MIT).
 */

const serializeFormDataPair = (data: FormData, key: string, value: unknown) => {
  if (typeof value === "string" || value instanceof Blob) data.append(key, value);
  else data.append(key, JSON.stringify(value));
};

const serializeUrlSearchParamsPair = (
  data: URLSearchParams,
  key: string,
  value: unknown,
) => {
  if (typeof value === "string") data.append(key, value);
  else data.append(key, JSON.stringify(value));
};

/** Serializes a body into `FormData` for multipart endpoints. */
export const formDataBodySerializer = {
  bodySerializer: <T extends Record<string, any> | Array<Record<string, any>>>(
    body: T,
  ) => {
    const data = new FormData();

    Object.entries(body).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value))
        value.forEach((v) => serializeFormDataPair(data, key, v));
      else serializeFormDataPair(data, key, value);
    });

    return data;
  },
};

/** default JSON serializer, with BigInt values stringified rather than thrown on. */
export const jsonBodySerializer = {
  bodySerializer: <T>(body: T) =>
    JSON.stringify(body, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
};

/** Serializes a body into a urlencoded string for form endpoints. */
export const urlSearchParamsBodySerializer = {
  bodySerializer: <T extends Record<string, any> | Array<Record<string, any>>>(
    body: T,
  ) => {
    const data = new URLSearchParams();

    Object.entries(body).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value))
        value.forEach((v) => serializeUrlSearchParamsPair(data, key, v));
      else serializeUrlSearchParamsPair(data, key, value);
    });

    return data.toString();
  },
};
