import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import { isNullish, nonNullish, type Option, type Result } from "@usenullish/nullish-common";
import type { RouteConfig } from "@hono/zod-openapi";
import { CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import type { QueryArgs } from "@usenullish/nullish-schema/db";
import * as z from "zod";
import type { DefineOpenAPIHandler, OpenAPIHandlerContext, Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

export function _defineListHandler<R extends RouteConfig, Select, TFilters = never>({
  query,
  build,
  resourceKey,
  filtersSchema,
}: {
  query: (
    args: DbStoreInitArgs & {
      context: OpenAPIHandlerContext<R>;
      filters: Option<TFilters>;
    } & QueryArgs<string>,
  ) => Promise<Result<Select[]>>;
  build: (result: Extract<Result<Select[]>, { status: "success" }>) => Response200<R>;
  resourceKey: string;
  filtersSchema?: z.ZodType<TFilters>;
}): DefineOpenAPIHandler<R> {
  return withRest<R>(
    withPermission<R>(async ({ context, caller }) => {
      const {
        var: {
          db: { connection },
        },
        req,
      } = context;

      const { limit, offset, sort, direction, ...filtersParams } = req.query();

      const parsedQuery = CommonSchema.Query.ListQuerySchema.safeParse({
        limit,
        offset,
        sort,
        direction,
      });

      if (!parsedQuery.success) {
        return errorResponse({
          context,
          error: "Bad Request",
          code: ErrorCode.VALIDATION,
          status: 400,
        });
      }

      const parsedFilters = isNullish(filtersSchema)
        ? undefined
        : filtersSchema.safeParse(filtersParams);

      if (nonNullish(parsedFilters) && !parsedFilters.success) {
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
        ...parsedQuery.data,
        filters: parsedFilters?.data,
      });

      if (result.status === "error") {
        if (result.err instanceof z.ZodError) {
          return errorResponse({
            context,
            error: "Bad Request",
            code: ErrorCode.VALIDATION,
            status: 400,
          });
        }

        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: `Failed to get ${resourceKey}`,
          }),
        });
      }

      return context.json(build(result), 200);
    }),
  );
}
