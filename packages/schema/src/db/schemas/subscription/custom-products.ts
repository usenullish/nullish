import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";
import { subscriptionProvider } from "./provider";
import { PlansSchema } from "./plans";

export const CustomProductsSchema = SubscriptionSchema.table(
  "custom_products",
  {
    id: primaryKey(),
    planId: pg.uuid().notNull(),
    provider: subscriptionProvider().notNull(),
    name: pg.text().notNull(),
    contactUrl: pg.text().notNull(),
  },
  (table) => [
    pg
      .foreignKey({
        name: "custom_products_plan_provider_fkey",
        columns: [table.planId, table.provider],
        foreignColumns: [PlansSchema.id, PlansSchema.provider],
      })
      .onDelete("cascade"),
    pg.check("custom_products_provider_custom", sql`${table.provider} = 'custom'`),
    pg.uniqueIndex("custom_products_plan_uidx").on(table.planId),
    ...readonlyPolicies({ tableName: "custom_products" }),
  ],
);

export const customProductIdReference = () =>
  pg
    .uuid()
    .references(() => CustomProductsSchema.id, { onDelete: "cascade" })
    .notNull();
