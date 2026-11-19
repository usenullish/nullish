import { CoreSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationIdReference } from "./organizations";
import { auditFields } from "../_audit";
import * as pg from "drizzle-orm/pg-core";
import { authUserIdReference } from "../auth/users";
import { membershipPolicies } from "../_policies";
import { MembershipRole } from "../../constants/memberships";

export const membershipRole = CoreSchema.enum("membership_role", MembershipRole);

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
