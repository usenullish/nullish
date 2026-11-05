import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import { isInvalidUuid, isNullish, type Option, type Result } from "@usenullish/nullish-common";
import type { RouteConfig } from "@hono/zod-openapi";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { DefineOpenAPIHandler, OpenAPIHandlerContext, Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

export function _defineGetByIdHandler<R extends RouteConfig, Select>({
  query,
  build,
  resourceKey,
}: {
  query: (
    args: DbStoreInitArgs & { context: OpenAPIHandlerContext<R> } & {
      id: string;
    },
  ) => Promise<Result<Option<Select>>>;
  build: (result: Extract<Result<Option<Select>>, { status: "success" }>) => Response200<R>;
  resourceKey: string;
}): DefineOpenAPIHandler<R> {
  return withRest<R>(
    withPermission<R>(async ({ context, caller }) => {
      const {
        var: {
          db: { connection },
        },
      } = context;

      const id = context.req.param("id");

      if (isInvalidUuid(id)) {
        return errorResponse({
          context,
          error: "Bad Request",
          code: ErrorCode.VALIDATION,
          status: 400,
        });
      }

      const result = await query({
        db: connection,
        userId: caller.userId,
        context,
        id,
      });

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: `Failed to get ${resourceKey}`,
          }),
        });
      }

      if (isNullish(result.result)) {
        return errorResponse({
          context,
          error: "Not Found",
          code: ErrorCode.NOT_FOUND,
          status: 404,
        });
      }

      return context.json(build(result));
    }),
  );
}
