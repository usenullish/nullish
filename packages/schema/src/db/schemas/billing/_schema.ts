import { snakeCase } from "drizzle-orm/pg-core";

export const BillingSchema = snakeCase.schema("billing");
