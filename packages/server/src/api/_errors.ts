import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { EngineError } from "@usenullish/nullish-engine";
import { LlmUsageLimitError } from "@usenullish/nullish-metering";
import { type Common, ErrorCode } from "@usenullish/nullish-schema/server";
import * as z from "zod";

const SERIALIZATION_FAILURE = "40001";
const RULE_VIOLATION = "R0001";

const VersionConflictSchema = z.object({
  cause: z.object({ errno: z.literal(SERIALIZATION_FAILURE) }),
});

const RuleViolationErrorSchema = z.object({
  errno: z.literal(RULE_VIOLATION),
  message: z.string().min(1),
});

const RuleViolationSchema = z.union([
  RuleViolationErrorSchema,
  z.object({ cause: RuleViolationErrorSchema }).transform(({ cause }) => cause),
]);

type ApiError = Common["Error"] & { status: 400 | 409 | 422 | 429 | 500 };

export const errorResponse = <Status extends ContentfulStatusCode>({
  context,
  error,
  code,
  status,
}: Common["Error"] & { context: Pick<Context, "json">; status: Status }) =>
  context.json({ error, code }, status);

// Only business errors raised by the engine and validation issues are exposed to the caller, so it
// can correct its next call. Unexpected errors (e.g. database errors) are only logged.
export const toApiError = ({ err, fallback }: { err: unknown; fallback: string }): ApiError => {
  if (err instanceof z.ZodError) {
    return { status: 400, code: ErrorCode.VALIDATION, error: z.prettifyError(err) };
  }

  if (err instanceof EngineError && err.message !== "") {
    return { status: 422, code: ErrorCode.REJECTED, error: err.message };
  }

  if (err instanceof LlmUsageLimitError) {
    return { status: 429, code: ErrorCode.LIMITED, error: err.message };
  }

  const ruleViolation = RuleViolationSchema.safeParse(err);

  if (ruleViolation.success) {
    return { status: 422, code: ErrorCode.REJECTED, error: ruleViolation.data.message };
  }

  if (VersionConflictSchema.safeParse(err).success) {
    return {
      status: 409,
      code: ErrorCode.CONFLICT,
      error:
        "The record was modified since it was read. Read it again to get its current version, then retry.",
    };
  }

  return { status: 500, code: ErrorCode.UNEXPECTED, error: fallback };
};
