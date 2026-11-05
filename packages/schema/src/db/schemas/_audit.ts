import * as pg from "drizzle-orm/pg-core";
import { timestampNow } from "./_temporal";

const version = () => pg.integer().notNull().default(1);

export const auditFields = () => ({
  createdAt: timestampNow(),
  updatedAt: timestampNow(),
  version: version(),
});
