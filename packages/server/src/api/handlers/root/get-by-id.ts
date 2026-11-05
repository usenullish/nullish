import type { DbStore, DbStoreInitArgs } from "@usenullish/nullish-engine";
import { type Option, type Result } from "@usenullish/nullish-common";
import { _defineGetByIdHandler } from "../_get-by-id";
import type { RouteConfig } from "@hono/zod-openapi";
import type { DefineOpenAPIHandler, Response200 } from "../../types/openapi";

export function defineGetByIdHandler<R extends RouteConfig, Select>({
  store,
  build,
  resourceKey,
}: {
  store: (args: DbStoreInitArgs) => DbStore<Select, string, unknown>;
  build: (result: Extract<Result<Option<Select>>, { status: "success" }>) => Response200<R>;
  resourceKey: string;
}): DefineOpenAPIHandler<R> {
  return _defineGetByIdHandler<R, Select>({
    query: async ({ db, userId, id }) => {
      return await store({ db, userId }).find({ pKey: id });
    },
    build,
    resourceKey,
  });
}
