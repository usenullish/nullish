import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import { isInvalidUuid, isNullish, type Option, type Result } from "@usenullish/nullish-common";
import * as z from "zod";
import type { RouteConfig } from "@hono/zod-openapi";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { DefineOpenAPIHandler, OpenAPIHandlerContext } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

export function _defineDeleteHandler<R extends RouteConfig, Select, SelectId>({
  delete: deleteFn,
  pKeySchema,
  resourceKey,
}: {
  delete: (
    args: DbStoreInitArgs & {
      context: OpenAPIHandlerContext<R>;
      pKey: SelectId;
    },
  ) => Promise<Result<Option<Select>>>;
  pKeySchema: z.ZodType<SelectId>;
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

      const id = req.param("id");

      if (isInvalidUuid(id)) {
        return errorResponse({
          context,
          error: "Bad Request",
          code: ErrorCode.VALIDATION,
          status: 400,
        });
      }

      const parsedPKey = pKeySchema.safeParse(id);

      if (!parsedPKey.success) {
        return errorResponse({
          context,
          error: "Bad Request key format",
          code: ErrorCode.VALIDATION,
          status: 400,
        });
      }

      const result = await deleteFn({
        db: connection,
        userId: caller.userId,
        context,
        pKey: parsedPKey.data,
      });

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: `Failed to delete ${resourceKey}`,
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

      return context.body(null, 204);
    }),
  );
}
