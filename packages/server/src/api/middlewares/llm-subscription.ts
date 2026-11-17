import { createMiddleware } from "hono/factory";
import { CheckSubscriptionService } from "@usenullish/nullish-engine/subscription";
import { ApiSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiEnv } from "../types/api";
import { errorResponse, toApiError } from "../_errors";

export const llmSubscriptionMiddleware = createMiddleware<ApiEnv>(async (context, next) => {
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

  const request = await context.req.json();

  // More a type guard given that we are actually using this middleware only to guard the chat
  const isChatRequest = ApiSchema.Chat.ChatRequestSchema.validate(request);

  if (!isChatRequest) {
    await next();
    return;
  }

  const { domain } = request;

  const checked = await CheckSubscriptionService.create({
    db: connection,
    userId: caller.userId,
  }).assertValid({
    organizationId: domain.type === "organization" ? domain.organizationId : null,
  });

  if (checked.status === "error") {
    return errorResponse({
      context,
      ...toApiError({ err: checked.err, fallback: "Internal server error" }),
    });
  }

  await next();
});
