import * as z from "zod";
import { _defineDeleteHandler } from "../_delete";
import type { DbDeletableStore, DbStoreInitArgs } from "@usenullish/nullish-engine";
import type { RouteConfig } from "@hono/zod-openapi";
import type { DefineOpenAPIHandler } from "../../types/openapi";

export function defineDeleteHandler<R extends RouteConfig, Select, SelectId>({
  store,
  pKeySchema,
  resourceKey,
}: {
  store: (args: DbStoreInitArgs) => DbDeletableStore<Select, SelectId>;
  pKeySchema: z.ZodType<SelectId>;
  resourceKey: string;
}): DefineOpenAPIHandler<R> {
  return _defineDeleteHandler<R, Select, SelectId>({
    delete: async ({ db, userId, pKey }) => store({ db, userId }).delete({ pKey }),
    pKeySchema,
    resourceKey,
  });
}
