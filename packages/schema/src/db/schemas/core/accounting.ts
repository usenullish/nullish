import { CoreSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationIdReference } from "./organizations";
import { currencyCodeReference } from "./currencies";
import { auditFields } from "../_audit";
import * as pg from "drizzle-orm/pg-core";
import { organizationPolicies } from "../_policies";

export const AccountingSettingsSchema = CoreSchema.table(
  "accounting_settings",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    baseCurrency: currencyCodeReference().default("CHF"),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("accounting_settings_org_uidx").on(table.organizationId),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "accounting_settings",
    }),
  ],
);
