import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { productFields, productRules } from "./_product";

export const ExternalProductsSchema = SubscriptionSchema.table(
  "external_products",
  {
    id: primaryKey(),
    ...productFields(),
    externalProductId: pg.text().notNull(),
  },
  (table) => [
    ...productRules({ tableName: "external_products", table }),
    pg.check(
      "external_products_provider_third_party",
      sql`${table.provider} NOT IN ('self', 'custom')`,
    ),
    pg
      .uniqueIndex("external_products_provider_external_product_uidx")
      .on(table.provider, table.externalProductId),
  ],
);
