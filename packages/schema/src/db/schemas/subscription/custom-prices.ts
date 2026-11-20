import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";
import { currencyCodeReference } from "../core/currencies";
import { currencyValue } from "../_currency";
import { customProductIdReference } from "./custom-products";
import { PaymentInterval } from "../../../payments/constants";

const billingPeriod = SubscriptionSchema.enum("billing_period", PaymentInterval);

export const CustomPricesSchema = SubscriptionSchema.table(
  "custom_prices",
  {
    id: primaryKey(),
    productId: customProductIdReference(),
    amount: currencyValue().notNull(),
    currency: currencyCodeReference(),
    billingPeriod: billingPeriod().notNull(),
  },
  (table) => [
    pg.check("custom_prices_amount_positive", sql`${table.amount} > 0`),
    pg
      .uniqueIndex("custom_prices_product_currency_billing_period_uidx")
      .on(table.productId, table.currency, table.billingPeriod),
    ...readonlyPolicies({ tableName: "custom_prices" }),
  ],
);
