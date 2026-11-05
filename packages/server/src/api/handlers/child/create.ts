import { isInvalidUuid, type Result } from "@usenullish/nullish-common";
import { _defineCreateHandler } from "../_create";
import type { DbCollectionStoreInitArgs, DbCollectionStore } from "@usenullish/nullish-engine";
import type { RouteConfig } from "@hono/zod-openapi";
import type { DefineOpenAPIHandler, RequestJson, Response201 } from "../../types/openapi";

export function defineChildCreateHandler<R extends RouteConfig, Select>({
  store,
  build,
  resourceKey,
}: {
  store: (args: DbCollectionStoreInitArgs<string>) => DbCollectionStore<Select, RequestJson<R>>;
  build: (result: Extract<Result<Select>, { status: "success" }>) => Response201<R>;
  resourceKey: string;
}): DefineOpenAPIHandler<R> {
  return _defineCreateHandler<R, Select>({
    insert: async ({ db, userId, context, values }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      return await store({ db, userId, foreignKeyId: parentId }).insert({ values });
    },
    build,
    resourceKey,
  });
}
