/**
 * @file core/pipeline.ts
 * @description The request lifecycle plugins attach to.
 *
 * Every capability on the roadmap — caching policies, schema validation,
 * telemetry, progress, mocking transports — attaches here as a GrabPlugin
 * instead of being patched into grab() ad hoc. This file only runs hooks and
 * builds the context; core.ts decides where in the request each stage falls.
 */

import type { GrabContext, GrabMeta, GrabPlugin } from "../common/types";
import { GrabError, isGrabError } from "../common/grab-error";

type Stage = Exclude<keyof GrabPlugin, "name">;

let sequence = 0;

/** A trace id that needs no crypto — Workers, old Safari and Node 18 all differ there. */
export function newTraceId(): string {
  sequence = (sequence + 1) % 0x100000;
  return `${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMeta(id: string, attempt: number): GrabMeta {
  return {
    id,
    startedAt: Date.now(),
    attempt,
    fromCache: false,
    deduped: false,
    transport: "fetch",
  };
}

/**
 * Runs one stage across all plugins, in order, awaiting each.
 *
 * A throw from a stage that shapes the request (before/after hooks) fails the
 * request as code PLUGIN, naming the plugin. A throw from onError or finally is
 * swallowed: those observe an outcome that is already decided.
 */
export async function runStage(
  plugins: GrabPlugin[] | undefined,
  stage: Stage,
  ctx: GrabContext,
): Promise<void> {
  if (!plugins?.length) return;
  for (const plugin of plugins) {
    const hook = plugin?.[stage];
    if (typeof hook !== "function") continue;
    try {
      await hook.call(plugin, ctx);
    } catch (e: any) {
      if (stage === "onError" || stage === "finally") continue;
      if (isGrabError(e)) throw e;
      throw new GrabError(`Plugin "${plugin.name}" failed in ${stage}: ${e?.message ?? e}`, {
        code: "PLUGIN",
        cause: e,
        response: ctx.response,
      });
    }
  }
}

/**
 * What core.ts hands an executor so the transport can report back mid-request
 * without the executor knowing about plugins.
 */
export type ExecutorHooks = {
  /** Which transport served the request */
  transport(name: GrabMeta["transport"]): void;
  /** A native Response arrived; awaited before status checks and parsing */
  response(res: Response): Promise<void>;
};

/**
 * Classifies a failure while reading or decoding the body. A SyntaxError is
 * the content being wrong (PARSE); anything else — undici's "terminated", a
 * reset connection — is the stream dying part-way (STREAM). The message stays
 * `prefix + e`, exactly as it read before errors were classified.
 */
export function bodyFailure(prefix: string, e: any, res?: Response): GrabError {
  return new GrabError(prefix + e, {
    code: e?.name === "SyntaxError" ? "PARSE" : "STREAM",
    cause: e,
    response: res,
  });
}
