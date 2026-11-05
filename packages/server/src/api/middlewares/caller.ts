import { createMiddleware } from "hono/factory";
import { isNullish, nonNullish, tryCatch } from "@usenullish/nullish-common";
import { AuthSchema } from "@usenullish/nullish-schema/auth";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiEnv } from "../types/api";
import type { Context, Next } from "hono";
import { errorResponse, toApiError } from "../_errors";

const BEARER = "Bearer " as const;

interface MiddleWareArgs {
  context: Context<ApiEnv, string>;
  next: Next;
}

export const loadCallerMiddleware = () =>
  createMiddleware<ApiEnv>(async (context, next) => {
    const { req } = context;

    const authHeader = req.header("Authorization");

    if (authHeader?.startsWith(BEARER)) {
      return await apiKeyMiddleware({
        context,
        next,
        token: authHeader.slice(BEARER.length),
      });
    }

    return await sessionMiddleware({ context, next });
  });

const sessionMiddleware = async ({ context, next }: MiddleWareArgs) => {
  const {
    req: { raw },
    var: { auth },
  } = context;

  const session = await auth.api.getSession({ headers: raw.headers });
  context.set(
    "caller",
    nonNullish(session) ? { type: "user", userId: session.user.id, ...session } : null,
  );

  await next();
};

const apiKeyMiddleware = async ({ context, next, token }: { token: string } & MiddleWareArgs) => {
  const {
    var: { auth },
  } = context;

  const result = await tryCatch(() =>
    auth.api.verifyApiKey({
      body: { key: token },
    }),
  );

  if (result.status === "error") {
    return errorResponse({
      context,
      ...toApiError({ err: result.err, fallback: "Internal server error" }),
    });
  }

  const {
    result: { valid, key },
  } = result;

  if (!valid || isNullish(key)) {
    return errorResponse({
      context,
      error: "Unauthorized",
      code: ErrorCode.UNAUTHORIZED,
      status: 401,
    });
  }

  const { referenceId, permissions } = key;

  context.set("caller", {
    type: "api-key",
    userId: referenceId,
    permissions: AuthSchema.ApiKeysSchema.ApiKeyPermissionsSchema.parse(permissions),
  });

  await next();
};
