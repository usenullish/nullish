import type { DbCollectionStore, DbStoreInitArgs } from "@usenullish/nullish-engine";
import { type Result } from "@usenullish/nullish-common";
import { _defineCreateHandler } from "../_create";
import type { RouteConfig } from "@hono/zod-openapi";
import type { DefineOpenAPIHandler, RequestJson, Response201 } from "../../types/openapi";

export function defineCreateHandler<R extends RouteConfig, Select>({
  store,
  build,
  resourceKey,
}: {
  store: (args: DbStoreInitArgs) => DbCollectionStore<Select, RequestJson<R>>;
  build: (result: Extract<Result<Select>, { status: "success" }>) => Response201<R>;
  resourceKey: string;
}): DefineOpenAPIHandler<R> {
  return _defineCreateHandler<R, Select>({
    insert: async ({ db, userId, values }) => {
      return await store({ db, userId }).insert({ values });
    },
    build,
    resourceKey,
  });
}
