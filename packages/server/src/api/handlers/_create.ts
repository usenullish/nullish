import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import { type Result } from "@usenullish/nullish-common";
import type { RouteConfig } from "@hono/zod-openapi";
import type {
  DefineOpenAPIHandler,
  OpenAPIHandlerContext,
  RequestJson,
  Response201,
} from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

export function _defineCreateHandler<R extends RouteConfig, Select>({
  insert,
  build,
  resourceKey,
}: {
  insert: (
    args: DbStoreInitArgs & {
      context: OpenAPIHandlerContext<R>;
      values: RequestJson<R>;
    },
  ) => Promise<Result<Select>>;
  build: (result: Extract<Result<Select>, { status: "success" }>) => Response201<R>;
  resourceKey: string;
}): DefineOpenAPIHandler<R> {
  return withRest<R>(
    withPermission<R>(async ({ context, caller }) => {
      const {
        req,
        var: {
          db: { connection },
        },
      } = context;

      const values = req.valid("json");

      const result = await insert({
        db: connection,
        userId: caller.userId,
        context,
        values,
      });

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: `Failed to create ${resourceKey}`,
          }),
        });
      }

      return context.json(build(result), 201);
    }),
  );
}
