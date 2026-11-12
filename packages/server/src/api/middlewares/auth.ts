import { createMiddleware } from "hono/factory";
import type { DbInstance } from "@usenullish/nullish-db";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiEnv } from "../types/api";
import { createAuth } from "@usenullish/nullish-auth/server";
import { isNullish } from "@usenullish/nullish-common";
import { envAuthSecret, envAuthUrl, envSignUp, isProd } from "@usenullish/nullish-env";
import { errorResponse } from "../_errors";

export const loadAuthMiddleware = ({ db: { connection } }: { db: DbInstance }) => {
  const auth = createAuth({
    db: connection,
    env: {
      signUp: envSignUp(),
      signIn: { autoSignIn: !isProd() },
      baseURL: envAuthUrl(),
      secret: envAuthSecret(),
    },
  });

  return createMiddleware<ApiEnv>(async (context, next) => {
    context.set("auth", auth);
    await next();
  });
};

export const assertAuthSessionMiddleware = createMiddleware<ApiEnv>(async (context, next) => {
  const {
    var: { caller },
  } = context;

  if (isNullish(caller)) {
    return errorResponse({
      context,
      error: "Unauthorized",
      code: ErrorCode.UNAUTHORIZED,
      status: 401,
    });
  }

  await next();
});
