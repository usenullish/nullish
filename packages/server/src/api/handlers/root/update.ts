import type { Result } from "@usenullish/nullish-common";
import * as z from "zod";
import { _defineUpdateHandler } from "../_update";
import type { DbStore, DbStoreInitArgs } from "@usenullish/nullish-engine";
import type { RouteConfig } from "@hono/zod-openapi";
import type { DefineOpenAPIHandler, RequestJson, Response200 } from "../../types/openapi";

export function defineUpdateHandler<R extends RouteConfig, Select, SelectId>({
  store,
  build,
  pKeySchema,
  resourceKey,
}: {
  store: (args: DbStoreInitArgs) => DbStore<Select, SelectId, RequestJson<R>>;
  build: (result: Extract<Result<Select>, { status: "success" }>) => Response200<R>;
  pKeySchema: z.ZodType<SelectId>;
  resourceKey: string;
}): DefineOpenAPIHandler<R> {
  return _defineUpdateHandler<R, Select, SelectId>({
    update: async ({ db, userId, values, pKey }) => store({ db, userId }).update({ values, pKey }),
    build,
    pKeySchema,
    resourceKey,
  });
}
