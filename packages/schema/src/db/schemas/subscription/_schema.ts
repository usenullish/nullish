import { snakeCase } from "drizzle-orm/pg-core";

export const SubscriptionSchema = snakeCase.schema("subscription");
