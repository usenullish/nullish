import { snakeCase } from "drizzle-orm/pg-core";

export const LedgerSchema = snakeCase.schema("ledger");
