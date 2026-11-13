import { createMiddleware } from "hono/factory";
import type { DbInstance } from "@usenullish/nullish-db";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { SendMail } from "@usenullish/nullish-schema/mail";
import type { ApiEnv } from "../types/api";
import { createAuth } from "@usenullish/nullish-auth/server";
import { isNullish, nonNullish, type Nullable } from "@usenullish/nullish-common";
import { envAuthSecret, envAppUrl, envSignUp, isProd } from "@usenullish/nullish-env";
import { errorResponse } from "../_errors";

export const loadAuthMiddleware = ({
  db: { connection },
  mail,
}: {
  db: DbInstance;
  mail: Nullable<SendMail>;
}) => {
  const auth = createAuth({
    db: connection,
    env: {
      signUp: envSignUp(),
      emailAndPassword: nonNullish(mail) ? { mail } : { autoSignIn: !isProd() },
      baseURL: envAppUrl(),
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
