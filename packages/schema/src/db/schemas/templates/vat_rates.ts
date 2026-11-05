import { TemplatesSchema } from "./_schema";
import { auditFields } from "../_audit";
import * as pg from "drizzle-orm/pg-core";
import { numeric, primaryKey } from "../_common";
import { readonlyPolicies } from "../_policies";
import { vatPaymentMethod, vatType } from "../core/vat";
import { RATE_DECIMALS } from "../../constants/vat";
import { date } from "../_temporal";
import { sql } from "drizzle-orm";

export const VatRatesTemplatesSchema = TemplatesSchema.table(
  "vat_rates",
  {
    id: primaryKey(),
    code: pg.text().notNull(),
    type: vatType().notNull(),
    paymentMethod: vatPaymentMethod(),
    rate: numeric({ precision: 6, scale: RATE_DECIMALS }).notNull(),
    startOn: date().notNull(),
    endOn: date(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("vat_rates_templates_code_start_uidx").on(table.code, table.startOn),
    pg.check(
      "vat_rates_templates_payment_method",
      sql`CASE ${table.type}
        WHEN 'net_rate_tax' THEN false
        WHEN 'sales_tax_due' THEN COALESCE(${table.paymentMethod} = 'effective', false)
        WHEN 'input_tax_materials' THEN COALESCE(${table.paymentMethod} = 'effective', false)
        WHEN 'input_tax_investments' THEN COALESCE(${table.paymentMethod} = 'effective', false)
        WHEN 'import_tax_materials' THEN COALESCE(${table.paymentMethod} = 'effective', false)
        WHEN 'import_tax_investments' THEN COALESCE(${table.paymentMethod} = 'effective', false)
        ELSE ${table.paymentMethod} IS NULL
      END`,
    ),
    ...readonlyPolicies({ tableName: "vat_rates_templates" }),
  ],
);
