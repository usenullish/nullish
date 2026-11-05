import { snakeCase } from "drizzle-orm/pg-core";

export const MigrationSchema = snakeCase.schema("migration");
