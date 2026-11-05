import { snakeCase } from "drizzle-orm/pg-core";

export const BankingSchema = snakeCase.schema("banking");
