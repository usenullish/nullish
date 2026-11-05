import type { TablesRelationalConfig } from "drizzle-orm";
import type { PgAsyncTransaction } from "drizzle-orm/pg-core";
import type { BunSQLQueryResultHKT } from "drizzle-orm/bun-sql";

export type Tx = PgAsyncTransaction<BunSQLQueryResultHKT, TablesRelationalConfig>;
