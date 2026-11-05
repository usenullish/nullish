import { isInvalidUuid, type Result } from "@usenullish/nullish-common";
import { _defineListHandler } from "../_list";
import type { DbCollectionStoreInitArgs, DbCollectionStore } from "@usenullish/nullish-engine";
import type { RouteConfig } from "@hono/zod-openapi";
import type * as z from "zod";
import type { DefineOpenAPIHandler, Response200 } from "../../types/openapi";

export function defineChildListHandler<R extends RouteConfig, Select, TFilters = never>({
  store,
  build,
  resourceKey,
  filtersSchema,
}: {
  store: (
    args: DbCollectionStoreInitArgs<string>,
  ) => DbCollectionStore<Select, unknown, string, TFilters>;
  build: (result: Extract<Result<Select[]>, { status: "success" }>) => Response200<R>;
  resourceKey: string;
  filtersSchema?: z.ZodType<TFilters>;
}): DefineOpenAPIHandler<R> {
  return _defineListHandler<R, Select, TFilters>({
    query: async ({ db, userId, context, pagination, sort, filters }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      return await store({
        db,
        userId,
        foreignKeyId: parentId,
      }).list({ pagination, sort, filters });
    },
    build,
    resourceKey,
    filtersSchema,
  });
}
