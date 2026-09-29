/**
 * @file contract.types.ts
 * @description Type-level contract for the public grab() surface. Never run —
 * compiled by `npm run test:types` (tsconfig.json beside it). A compile error
 * here is a breaking change to what TypeScript consumers can write.
 */

import grab, { GrabError, isGrabError } from "grab-url";
import type {
  GrabContext,
  GrabErrorCode,
  GrabMeta,
  GrabPlugin,
  GrabResponse,
} from "grab-url";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
function assertType<T extends true>(_?: T) {}

type User = { id: number; name: string };

async function responses() {
  // The generic types the response, and .error stays a string.
  const user = await grab<User>("users/1");
  const id: number = user.id;
  const error: string | undefined = user.error;
  const loading: boolean | undefined = user.isLoading;
  assertType<Equal<typeof user, GrabResponse<User>>>();
  void [id, error, loading];

  // @ts-expect-error — fields not on User are not invented
  const nope: string = user.id;
  void nope;
}

async function errors() {
  await grab("users", {
    onError(message: string, url: string, params: unknown, e: GrabError) {
      const code: GrabErrorCode = e.code;
      const retryable: boolean = e.retryable;
      const attempt: number = e.attempt;
      const res: Response | undefined = e.response;
      void [message, url, params, code, retryable, attempt, res];
    },
  });

  const e: unknown = new GrabError("x", { code: "HTTP", status: 500 });
  if (isGrabError(e)) {
    const status: number | undefined = e.status;
    void status;
  }

  // @ts-expect-error — codes are a closed union
  new GrabError("x", { code: "NOT_A_CODE" });
}

function plugins() {
  const timing: GrabPlugin = {
    name: "timing",
    beforeRequest(ctx: GrabContext) {
      const url: string = ctx.url;
      const init: RequestInit = ctx.init;
      ctx.init.headers["x-trace-id"] = ctx.id;
      if (ctx.init.body instanceof FormData) delete ctx.init.headers["Content-Type"];
      void [url, init];
    },
    async afterParse(ctx) {
      ctx.data = { replaced: true };
    },
    finally(ctx) {
      const meta: GrabMeta = ctx.meta;
      const transport: "fetch" | "undici" | "xhr" | "mock" = meta.transport;
      const duration: number | undefined = meta.durationMs;
      void [transport, duration];
    },
  };

  grab.defaults = { plugins: [timing] };
  grab.instance({ plugins: [timing] });

  // @ts-expect-error — a plugin needs a name
  const unnamed: GrabPlugin = { beforeRequest() {} };
  void unnamed;

  const flags: boolean | undefined = grab.supports?.plugins;
  void flags;
}

void [responses, errors, plugins];
