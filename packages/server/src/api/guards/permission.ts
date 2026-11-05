import type { RouteConfig } from "@hono/zod-openapi";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import { ApiKeyAction, ApiKeyResource } from "@usenullish/nullish-schema/auth";
import { isNullish } from "@usenullish/nullish-common";
import { errorResponse } from "../_errors";
import type { GuardContext, GuardedHandler } from "./caller";
import type { OpenAPIHandlerContext } from "../types/openapi";

const API_KEY_ACTIONS: Record<string, ApiKeyAction> = {
  GET: ApiKeyAction.READ,
  HEAD: ApiKeyAction.READ,
  POST: ApiKeyAction.WRITE,
  PUT: ApiKeyAction.WRITE,
  PATCH: ApiKeyAction.WRITE,
  DELETE: ApiKeyAction.WRITE,
};

// - A user (session) is allowed to use the API.
// - The MCP should not use directly the API (checked earlier through withRest).
// - API keys need the permission: read for GET and HEAD, write for POST, PUT, PATCH and DELETE. Any other method is refused.
export const withPermission =
  <R extends RouteConfig, C extends GuardContext = OpenAPIHandlerContext<R>>(
    handler: GuardedHandler<R, C>,
  ): GuardedHandler<R, C> =>
  async ({ context, caller }) => {
    // We chain the guards that's why a caller of type "user" pass by this function
    if (caller.type === "user") {
      return await handler({ context, caller });
    }

    const action = API_KEY_ACTIONS[context.req.method];

    if (isNullish(action)) {
      return errorResponse({
        context,
        error: "Unauthorized",
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
      });
    }

    const apiActions = caller.permissions[ApiKeyResource.API] ?? [];

    if (!apiActions.includes(action)) {
      return errorResponse({
        context,
        error: "Unauthorized",
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
      });
    }

    return await handler({ context, caller });
  };
