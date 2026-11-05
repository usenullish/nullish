import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import { isInvalidUuid, type Result } from "@usenullish/nullish-common";
import * as z from "zod";
import type { RouteConfig } from "@hono/zod-openapi";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type {
  DefineOpenAPIHandler,
  OpenAPIHandlerContext,
  RequestJson,
  Response200,
} from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

export function _defineUpdateHandler<R extends RouteConfig, Select, SelectId>({
  update,
  pKeySchema,
  build,
  resourceKey,
}: {
  update: (
    args: DbStoreInitArgs & {
      context: OpenAPIHandlerContext<R>;
      values: RequestJson<R>;
      pKey: SelectId;
    },
  ) => Promise<Result<Select>>;
  pKeySchema: z.ZodType<SelectId>;
  build: (result: Extract<Result<Select>, { status: "success" }>) => Response200<R>;
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

      const values = req.valid("json");

      const result = await update({
        db: connection,
        userId: caller.userId,
        context,
        values,
        pKey: parsedPKey.data,
      });

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: `Failed to update ${resourceKey}`,
          }),
        });
      }

      return context.json(build(result), 200);
    }),
  );
}
