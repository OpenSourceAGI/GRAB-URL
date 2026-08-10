/**
 * @file core/path-serializer.ts
 * @description OpenAPI parameter serialization (style/explode) for path and
 * query values. Ported from Hey API's client core (MIT) so generated SDKs
 * produce byte-identical URLs no matter which client they run on.
 * @see https://swagger.io/docs/specification/serialization
 */

import type {
  ArraySeparatorStyle,
  ObjectSeparatorStyle,
  SerializerOptions,
} from "../types";

interface SerializePrimitiveOptions {
  allowReserved?: boolean;
  name: string;
}

interface SerializeOptions<T>
  extends SerializePrimitiveOptions,
    SerializerOptions<T> {}

/** Separator between exploded array members for the given style. */
export const separatorArrayExplode = (style: ArraySeparatorStyle) => {
  switch (style) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};

/** Separator between non-exploded array members for the given style. */
export const separatorArrayNoExplode = (style: ArraySeparatorStyle) => {
  switch (style) {
    case "form":
      return ",";
    case "pipeDelimited":
      return "|";
    case "spaceDelimited":
      return "%20";
    default:
      return ",";
  }
};

/** Separator between exploded object entries for the given style. */
export const separatorObjectExplode = (style: ObjectSeparatorStyle) => {
  switch (style) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};

/** Serializes `name=value`, percent-encoding unless reserved chars are allowed. */
export const serializePrimitiveParam = ({
  allowReserved,
  name,
  value,
}: SerializePrimitiveOptions & { value: string }) => {
  if (value === undefined || value === null) return "";

  if (typeof value === "object")
    throw new Error(
      "Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these.",
    );

  return `${name}=${allowReserved ? value : encodeURIComponent(value)}`;
};

/** Serializes an array parameter under the given style/explode combination. */
export const serializeArrayParam = ({
  allowReserved,
  explode,
  name,
  style,
  value,
}: SerializeOptions<ArraySeparatorStyle> & { value: unknown[] }) => {
  if (!explode) {
    const joinedValues = (
      allowReserved ? value : value.map((v) => encodeURIComponent(v as string))
    ).join(separatorArrayNoExplode(style));
    switch (style) {
      case "label":
        return `.${joinedValues}`;
      case "matrix":
        return `;${name}=${joinedValues}`;
      case "simple":
        return joinedValues;
      default:
        return `${name}=${joinedValues}`;
    }
  }

  const separator = separatorArrayExplode(style);
  const joinedValues = value
    .map((v) => {
      if (style === "label" || style === "simple")
        return allowReserved ? v : encodeURIComponent(v as string);

      return serializePrimitiveParam({
        allowReserved,
        name,
        value: v as string,
      });
    })
    .join(separator);

  return style === "label" || style === "matrix"
    ? separator + joinedValues
    : joinedValues;
};

/** Serializes an object parameter under the given style/explode combination. */
export const serializeObjectParam = ({
  allowReserved,
  explode,
  name,
  style,
  value,
  valueOnly,
}: SerializeOptions<ObjectSeparatorStyle> & {
  value: Record<string, unknown> | Date;
  valueOnly?: boolean;
}) => {
  if (value instanceof Date)
    return valueOnly ? value.toISOString() : `${name}=${value.toISOString()}`;

  if (style !== "deepObject" && !explode) {
    let values: string[] = [];
    Object.entries(value).forEach(([key, v]) => {
      values = [
        ...values,
        key,
        allowReserved ? (v as string) : encodeURIComponent(v as string),
      ];
    });
    const joinedValues = values.join(",");
    switch (style) {
      case "form":
        return `${name}=${joinedValues}`;
      case "label":
        return `.${joinedValues}`;
      case "matrix":
        return `;${name}=${joinedValues}`;
      default:
        return joinedValues;
    }
  }

  const separator = separatorObjectExplode(style);
  const joinedValues = Object.entries(value)
    .map(([key, v]) =>
      serializePrimitiveParam({
        allowReserved,
        name: style === "deepObject" ? `${name}[${key}]` : key,
        value: v as string,
      }),
    )
    .join(separator);

  return style === "label" || style === "matrix"
    ? separator + joinedValues
    : joinedValues;
};

const PATH_PARAM_RE = /\{[^{}]+\}/g;

/** Replaces `{placeholders}` in a url with their serialized values. */
export const defaultPathSerializer = ({
  path,
  url: _url,
}: {
  path: Record<string, unknown>;
  url: string;
}) => {
  let url = _url;
  const matches = _url.match(PATH_PARAM_RE);
  if (!matches) return url;

  for (const match of matches) {
    let explode = false;
    let name = match.substring(1, match.length - 1);
    let style: ArraySeparatorStyle = "simple";

    if (name.endsWith("*")) {
      explode = true;
      name = name.substring(0, name.length - 1);
    }

    if (name.startsWith(".")) {
      name = name.substring(1);
      style = "label";
    } else if (name.startsWith(";")) {
      name = name.substring(1);
      style = "matrix";
    }

    const value = path[name];
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      url = url.replace(
        match,
        serializeArrayParam({ explode, name, style, value }),
      );
      continue;
    }

    if (typeof value === "object") {
      url = url.replace(
        match,
        serializeObjectParam({
          explode,
          name,
          style,
          value: value as Record<string, unknown>,
          valueOnly: true,
        }),
      );
      continue;
    }

    if (style === "matrix") {
      url = url.replace(
        match,
        `;${serializePrimitiveParam({ name, value: value as string })}`,
      );
      continue;
    }

    url = url.replace(
      match,
      encodeURIComponent(style === "label" ? `.${value as string}` : (value as string)),
    );
  }

  return url;
};
