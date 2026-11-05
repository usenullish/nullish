import * as z from "zod";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { DefineRawHandler } from "../types/raw-api";
import { isNullish, type Option } from "@usenullish/nullish-common";
import { McpHandler } from "../mcp/mcp";
import { ApiKeyAction, ApiKeyResource } from "@usenullish/nullish-schema/auth";
import { errorResponse, toApiError } from "../_errors";

// We use @hono/mcp (https://github.com/honojs/middleware/tree/main/packages/mcp)
// instead of @modelcontextprotocol/sdk because it patches an issue for using the MCP server
// with some clients such as Claude Code.
// References:
// - https://github.com/honojs/middleware/pull/1774
// - https://github.com/honojs/middleware/issues/1773#issuecomment-4193499002
// - https://github.com/anthropics/claude-code/issues/42470
export const defineMcp: DefineRawHandler<z.ZodType<Option<Response>>> = async (context) => {
  const {
    var: {
      db: { connection },
      workers: { jobs },
      caller,
    },
  } = context;

  if (isNullish(caller)) {
    return errorResponse({
      context,
      error: "Unauthorized",
      code: ErrorCode.UNAUTHORIZED,
      status: 401,
    });
  }

  // Sessions are refused until there is a use case: MCP clients authenticate with an API key and
  // the chat uses an in-process MCP client, not this endpoint.
  if (caller.type !== "api-key") {
    return errorResponse({
      context,
      error: "Unauthorized",
      code: ErrorCode.UNAUTHORIZED,
      status: 401,
    });
  }

  // Note: AuthSchema.ApiKeysSchema.ApiKeyPermissionsSchema refines permission to make WRITE requires READ as well
  // So READ should be set when WRITE is set
  if (!(caller.permissions[ApiKeyResource.MCP] ?? []).includes(ApiKeyAction.READ)) {
    return errorResponse({
      context,
      error: "Unauthorized",
      code: ErrorCode.UNAUTHORIZED,
      status: 401,
    });
  }

  const { userId } = caller;

  const readOnly = !(caller.permissions[ApiKeyResource.MCP] ?? []).includes(ApiKeyAction.WRITE);

  const result = await McpHandler.create({
    db: connection,
    userId,
    jobs,
    readOnly,
  }).handleRequest({ context });

  if (result.status === "error") {
    console.error(result.err);
    return errorResponse({
      context,
      ...toApiError({ err: result.err, fallback: "Internal server error" }),
    });
  }

  const { result: response } = result;
  return response;
};
