import * as pg from "drizzle-orm/pg-core";
import { auditFields } from "../_audit";
import { organizationIdReference } from "../core/organizations";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { LedgerSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationPolicies } from "../_policies";
import { AccountType } from "../../constants/accounts";

export const accountType = LedgerSchema.enum("account_type", AccountType);

export const accountMetadata = () => ({
  code: pg.text().notNull(),
  type: accountType().notNull(),
});

export const AccountsSchema = LedgerSchema.table(
  "accounts",
  {
    id: primaryKey(),
    parentId: pg.uuid().references((): AnyPgColumn => AccountsSchema.id),
    organizationId: organizationIdReference(),
    name: pg.text(),
    ...accountMetadata(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("accounts_org_code_uidx").on(table.organizationId, table.code),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "accounts",
    }),
  ],
);

export const accountIdReference = () =>
  pg
    .uuid()
    .references(() => AccountsSchema.id)
    .notNull();
