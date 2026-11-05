import { LedgerSchema } from "./_schema";
import * as pg from "drizzle-orm/pg-core";
import { auditFields } from "../_audit";
import { primaryKey } from "../_common";
import { organizationIdReference } from "../core/organizations";
import { accountIdReference } from "./accounts";
import { organizationPolicies } from "../_policies";
import { SystemAccountPurpose } from "../../constants/accounts-system";

export const systemAccountPurpose = LedgerSchema.enum(
  "system_account_purpose",
  SystemAccountPurpose,
);

export const SystemAccountsSchema = LedgerSchema.table(
  "system_accounts",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    accountId: accountIdReference(),
    purpose: systemAccountPurpose().notNull(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("system_accounts_org_purpose_uidx").on(table.organizationId, table.purpose),
    pg.uniqueIndex("system_accounts_org_account_uidx").on(table.organizationId, table.accountId),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "system_accounts",
    }),
  ],
);
