/**
 * @file common/grab-error.ts
 * @description The one error class every failed grab() is classified into.
 *
 * grab() does not throw — a failure still resolves to a response carrying
 * `.error` as a **string**, and that string is part of the contract (see
 * RUNTIME_SUPPORT.md). A GrabError keeps that exact message and adds what the
 * string drops: a stable `code`, the native Response and cause, the attempt
 * number, and whether a retry could plausibly succeed. It reaches callers
 * through the fourth argument of `onError` and through plugin `onError` hooks,
 * so framework adapters, telemetry and tests can branch on `code` instead of
 * pattern-matching message text.
 */

/** Stable failure categories. New codes may be added; existing ones never change meaning. */
export type GrabErrorCode =
  /** The request's signal was aborted (cancelOngoingIfNew, or a caller's abort) */
  | "ABORTED"
  /** The `timeout` option elapsed */
  | "TIMEOUT"
  /** fetch() rejected before a response arrived: DNS, refused, TLS, CORS */
  | "NETWORK"
  /** A response arrived with a non-2xx status */
  | "HTTP"
  /** The body arrived but could not be parsed as the detected content type */
  | "PARSE"
  /** Reserved for response/request schema validation */
  | "VALIDATION"
  /** The `rateLimit` option refused the request */
  | "RATE_LIMITED"
  /** Reserved for cache-store failures */
  | "CACHE"
  /** The body stream failed part-way, or an `onStream` consumer threw */
  | "STREAM"
  /** A plugin's beforeRequest / afterResponse / beforeParse / afterParse hook threw */
  | "PLUGIN"
  /** Anything else — a mock handler that throws, an `onRequest` that throws */
  | "UNKNOWN";

export type GrabErrorInit = {
  code: GrabErrorCode;
  cause?: unknown;
  url?: string;
  method?: string;
  response?: Response;
  status?: number;
  attempt?: number;
  traceId?: string;
  data?: unknown;
  issues?: unknown;
};

/** Statuses a retry can plausibly fix. 501/505 and the rest of 4xx cannot. */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export class GrabError extends Error {
  code: GrabErrorCode;
  /** Full URL requested, query string included */
  url?: string;
  method?: string;
  /** The native Response, for HTTP failures and failures after headers arrived */
  response?: Response;
  status?: number;
  /** 1-based; attempt 2 is the first retry */
  attempt: number;
  /** Whether retrying the same request could succeed. Informational only:
   * `retryAttempts` still retries every failure, as it always has. */
  retryable: boolean;
  /** Shared by every attempt of one grab() call */
  traceId: string;
  /** Parsed error body, when a caller or plugin supplies it */
  data?: unknown;
  /** Validation issues, when code is VALIDATION */
  issues?: unknown;
  declare cause?: unknown;

  constructor(message: string, init: GrabErrorInit) {
    super(message);
    this.name = "GrabError";
    this.code = init.code;
    // Assigned rather than passed as `{ cause }` so it works on runtimes whose
    // Error constructor predates the ES2022 options bag.
    if (init.cause !== undefined) this.cause = init.cause;
    this.url = init.url;
    this.method = init.method;
    this.response = init.response;
    this.status = init.status ?? init.response?.status;
    this.attempt = init.attempt ?? 1;
    this.traceId = init.traceId ?? "";
    this.data = init.data;
    this.issues = init.issues;
    this.retryable =
      init.code === "NETWORK" ||
      init.code === "TIMEOUT" ||
      init.code === "STREAM" ||
      (init.code === "HTTP" && this.status !== undefined && RETRYABLE_STATUSES.has(this.status));
  }
}

/** True for a GrabError, including one from another copy of the library. */
export function isGrabError(error: unknown): error is GrabError {
  return error instanceof GrabError || (error as any)?.name === "GrabError";
}

/**
 * Classifies whatever fetch() rejected with. The message is kept verbatim —
 * it becomes the response's `.error` string.
 *
 * The signal is consulted because runtimes disagree on what a fired
 * `AbortSignal.timeout` rejects with: Chromium, Firefox, Node, Bun and Deno
 * reject with a TimeoutError, WebKit with a plain AbortError. The signal's
 * `reason` is a TimeoutError everywhere.
 */
export function fetchFailure(e: any, signal?: AbortSignal | null): GrabError {
  const timedOut =
    e?.name === "TimeoutError" ||
    (signal?.aborted === true && (signal as any).reason?.name === "TimeoutError");
  const code: GrabErrorCode =
    timedOut ? "TIMEOUT"
      : e?.name === "AbortError" ? "ABORTED"
        : "NETWORK";
  return new GrabError(e?.message ?? String(e), { code, cause: e });
}

/**
 * Wraps any thrown value as a GrabError, keeping its message, and stamps the
 * attempt context onto it. An existing GrabError is completed, not replaced,
 * so the code chosen where the failure happened survives.
 */
export function toGrabError(
  error: unknown,
  context: { code?: GrabErrorCode; url?: string; method?: string; attempt?: number; traceId?: string } = {},
): GrabError {
  const e: GrabError = isGrabError(error)
    ? error
    : new GrabError((error as any)?.message ?? String(error), {
        code: context.code ?? "UNKNOWN",
        cause: error,
      });
  e.url ??= context.url;
  e.method ??= context.method;
  if (context.attempt) e.attempt = context.attempt;
  if (context.traceId && !e.traceId) e.traceId = context.traceId;
  return e;
}
