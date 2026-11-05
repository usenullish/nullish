import { createMiddleware } from "hono/factory";
import type { DbInstance } from "@usenullish/nullish-db";

import type { ApiEnv } from "../types/api";

export const loadDbMiddleware = ({ db }: { db: DbInstance }) =>
  createMiddleware<ApiEnv>(async (context, next) => {
    context.set("db", { connection: db.connection });
    await next();
  });
