import { snakeCase } from "drizzle-orm/pg-core";

export const AuditSchema = snakeCase.schema("audit");
