import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";
import { subscriptionProvider } from "./provider";
import { PlansSchema } from "./plans";

export const ExternalProductsSchema = SubscriptionSchema.table(
  "external_products",
  {
    id: primaryKey(),
    planId: pg.uuid().notNull(),
    provider: subscriptionProvider().notNull(),
    externalProductId: pg.text().notNull(),
  },
  (table) => [
    pg
      .foreignKey({
        name: "external_products_plan_provider_fkey",
        columns: [table.planId, table.provider],
        foreignColumns: [PlansSchema.id, PlansSchema.provider],
      })
      .onDelete("cascade"),
    pg.check(
      "external_products_provider_third_party",
      sql`${table.provider} NOT IN ('self', 'custom')`,
    ),
    pg.uniqueIndex("external_products_plan_uidx").on(table.planId),
    pg
      .uniqueIndex("external_products_provider_external_product_uidx")
      .on(table.provider, table.externalProductId),
    ...readonlyPolicies({ tableName: "external_products" }),
  ],
);
