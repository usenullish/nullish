import { CoreSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationIdReference } from "./organizations";
import { auditFields } from "../_audit";
import * as pg from "drizzle-orm/pg-core";
import { authUserIdReference } from "../auth/users";
import { membershipPolicies } from "../_policies";

export const membershipRole = CoreSchema.enum("membership_role", [
  "admin", // full access: bookkeeping + organization/user administration
  "accountant", // full bookkeeping access (accounts, journal, periods, VAT), no org/user administration
  "reviewer", // read-only access
]);

export const MembershipsSchema = CoreSchema.table(
  "memberships",
  {
    id: primaryKey(),
    userId: authUserIdReference(),
    organizationId: organizationIdReference(),
    role: membershipRole().notNull(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("memberships_user_org_uidx").on(table.userId, table.organizationId),
    ...membershipPolicies({
      userId: table.userId,
      organizationId: table.organizationId,
    }),
  ],
);
