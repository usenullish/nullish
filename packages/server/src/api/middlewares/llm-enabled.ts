import { createMiddleware } from "hono/factory";
import { envLlmEnabled } from "@usenullish/nullish-env";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiEnv } from "../types/api";
import { errorResponse } from "../_errors";

export const assertLlmEnabledMiddleware = createMiddleware<ApiEnv>(async (context, next) => {
  if (!envLlmEnabled()) {
    return errorResponse({
      context,
      error: "The assistant is not enabled on this instance.",
      code: ErrorCode.REJECTED,
      status: 503,
    });
  }

  await next();
});
