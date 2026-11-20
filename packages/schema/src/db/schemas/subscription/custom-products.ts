import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { productFields, productRules } from "./_product";

export const CustomProductsSchema = SubscriptionSchema.table(
  "custom_products",
  {
    id: primaryKey(),
    ...productFields(),
    contactUrl: pg.text().notNull(),
  },
  (table) => [
    ...productRules({ tableName: "custom_products", table }),
    pg.check("custom_products_provider_custom", sql`${table.provider} = 'custom'`),
  ],
);

export const customProductIdReference = () =>
  pg
    .uuid()
    .references(() => CustomProductsSchema.id, { onDelete: "cascade" })
    .notNull();
