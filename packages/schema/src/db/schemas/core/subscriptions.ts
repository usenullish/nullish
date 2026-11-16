import { CoreSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationIdReference } from "./organizations";
import { auditFields } from "../_audit";
import { timestamp } from "../_temporal";
import * as pg from "drizzle-orm/pg-core";
import { SubscriptionStatus } from "../../constants/subscriptions";
import { subscriptionPolicies } from "../_policies";

export const subscriptionStatus = CoreSchema.enum("subscription_status", SubscriptionStatus);

export const SubscriptionsSchema = CoreSchema.table(
  "subscriptions",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    status: subscriptionStatus().notNull(),
    periodEnd: timestamp(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("subscriptions_org_uidx").on(table.organizationId),
    ...subscriptionPolicies({ organizationId: table.organizationId }),
  ],
);
