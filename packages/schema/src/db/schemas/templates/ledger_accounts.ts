import { accountMetadata } from "../ledger/accounts";
import { TemplatesSchema } from "./_schema";
import { auditFields } from "../_audit";
import * as pg from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { primaryKey } from "../_common";
import { legalForm } from "../core/legal";
import { readonlyPolicies } from "../_policies";
import { systemAccountPurpose } from "../ledger/accounts-system";
import { sql } from "drizzle-orm";

export const LedgerAccountsTemplatesSchema = TemplatesSchema.table(
  "ledger_accounts",
  {
    id: primaryKey(),
    parentId: pg.uuid().references((): AnyPgColumn => LedgerAccountsTemplatesSchema.id),
    legalForm: legalForm().notNull(),
    purpose: systemAccountPurpose(),
    ...accountMetadata(),
    ...auditFields(),
  },
  (table) => [
    pg
      .uniqueIndex("ledger_accounts_templates_legal_form_purpose_uidx")
      .on(table.legalForm, table.purpose)
      .where(sql`${table.purpose} IS NOT NULL`),
    ...readonlyPolicies({ tableName: "ledger_accounts" }),
  ],
);
