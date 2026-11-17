import { snakeCase } from "drizzle-orm/pg-core";

export const InstanceSchema = snakeCase.schema("instance");
