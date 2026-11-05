import { type Result } from "@usenullish/nullish-common";
import { _defineListHandler } from "../_list";
import type { DbCollectionStore, DbStoreInitArgs } from "@usenullish/nullish-engine";
import type { RouteConfig } from "@hono/zod-openapi";
import type * as z from "zod";
import type { DefineOpenAPIHandler, Response200 } from "../../types/openapi";

export function defineListHandler<R extends RouteConfig, Select, TFilters = never>({
  store,
  build,
  resourceKey,
  filtersSchema,
}: {
  store: (args: DbStoreInitArgs) => DbCollectionStore<Select, unknown, string, TFilters>;
  build: (result: Extract<Result<Select[]>, { status: "success" }>) => Response200<R>;
  resourceKey: string;
  filtersSchema?: z.ZodType<TFilters>;
}): DefineOpenAPIHandler<R> {
  return _defineListHandler<R, Select, TFilters>({
    query: async ({ db, userId, pagination, sort, filters }) => {
      return await store({
        db,
        userId,
      }).list({ pagination, sort, filters });
    },
    build,
    resourceKey,
    filtersSchema,
  });
}
