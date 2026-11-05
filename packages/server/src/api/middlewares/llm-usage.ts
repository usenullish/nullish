import { createMiddleware } from "hono/factory";
import { MAX_CHAT_DURATION_SECONDS, MAX_OUTPUT_TOKENS, MAX_ROUNDS } from "@usenullish/nullish-chat";
import { LlmMeter } from "@usenullish/nullish-metering";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiEnv } from "../types/api";
import { errorResponse, toApiError } from "../_errors";

export const llmUsageLimitMiddleware = createMiddleware<ApiEnv>(async (context, next) => {
  const {
    var: {
      db: { connection },
      caller,
    },
  } = context;

  if (caller?.type !== "user") {
    return errorResponse({
      context,
      error: "Unauthorized",
      code: ErrorCode.UNAUTHORIZED,
      status: 401,
    });
  }

  const { userId } = caller;

  const opened = await LlmMeter.open({
    db: connection,
    userId,
    reservedTokens: BigInt(MAX_ROUNDS * MAX_OUTPUT_TOKENS),
    expiresInSeconds: MAX_CHAT_DURATION_SECONDS,
  });

  if (opened.status === "error") {
    return errorResponse({
      context,
      ...toApiError({ err: opened.err, fallback: "Internal server error" }),
    });
  }

  context.set("llm", { meter: opened.result });

  await next();
});
