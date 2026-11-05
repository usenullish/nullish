import type { RouteConfig } from "@hono/zod-openapi";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import { isNullish } from "@usenullish/nullish-common";
import type { Context, HonoRequest } from "hono";
import type { ApiCaller, ApiEnv } from "../types/api";
import type { OpenAPIHandlerContext } from "../types/openapi";
import { errorResponse } from "../_errors";

export type GuardContext = Pick<Context<ApiEnv>, "var" | "json"> & {
  req: Pick<HonoRequest, "method">;
};

export type GuardedHandler<
  R extends RouteConfig,
  C extends GuardContext = OpenAPIHandlerContext<R>,
> = (args: { context: C; caller: ApiCaller }) => Promise<Response>;

// The caller is Nullish in ApiEnv. The resource routes are guarded by assertAuthSessionMiddleware,
// but we did not find yet a way to carry that guarantee to the handler types, so we check it again.
export const withCaller =
  <R extends RouteConfig, C extends GuardContext = OpenAPIHandlerContext<R>>(
    handler: GuardedHandler<R, C>,
  ): ((context: C) => Promise<Response>) =>
  async (context) => {
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

    return await handler({ context, caller });
  };
