import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { sql, type SQL } from "drizzle-orm";

export const lowerSql = (value: AnyPgColumn): SQL => {
  return sql`lower(${value})`;
};
