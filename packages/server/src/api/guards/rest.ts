import type { RouteConfig } from "@hono/zod-openapi";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import { ApiKeyResource } from "@usenullish/nullish-schema/auth";
import { nonNullish } from "@usenullish/nullish-common";
import type { OpenAPIHandlerContext } from "../types/openapi";
import { errorResponse } from "../_errors";
import { type GuardContext, type GuardedHandler, withCaller } from "./caller";

// API keys with the MCP permission are meant for the /mcp endpoint only. Its tools use the engine
// directly and never go through the REST routes.
export const withRest = <R extends RouteConfig, C extends GuardContext = OpenAPIHandlerContext<R>>(
  handler: GuardedHandler<R, C>,
): ((context: C) => Promise<Response>) =>
  withCaller<R, C>(async ({ context, caller }) => {
    if (caller.type === "api-key" && nonNullish(caller.permissions[ApiKeyResource.MCP])) {
      return errorResponse({
        context,
        error: "Unauthorized",
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
      });
    }

    return await handler({ context, caller });
  });
