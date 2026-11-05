import { CoreSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationIdReference } from "./organizations";
import { auditFields } from "../_audit";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizationPolicies } from "../_policies";
import { vatRateIdReference } from "./vat";
import { bankRelationIdReference } from "./bank";

export const BillingSettingsSchema = CoreSchema.table(
  "billing_settings",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    paymentTermDays: pg.integer().notNull().default(30),
    vatRateId: vatRateIdReference(),
    bankRelationId: bankRelationIdReference(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("billing_settings_org_uidx").on(table.organizationId),
    pg.check("billing_settings_payment_term_days_non_negative", sql`${table.paymentTermDays} >= 0`),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "billing_settings",
    }),
  ],
);
