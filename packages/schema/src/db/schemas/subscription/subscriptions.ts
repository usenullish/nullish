import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationIdReference } from "../core/organizations";
import { auditFields } from "../_audit";
import { timestamp } from "../_temporal";
import * as pg from "drizzle-orm/pg-core";
import { SubscriptionStatus } from "../../constants/subscriptions";
import { subscriptionPolicies } from "../_policies";
import { claimIdReference } from "./claims";

export const subscriptionStatus = SubscriptionSchema.enum(
  "subscription_status",
  SubscriptionStatus,
);

export const SubscriptionsSchema = SubscriptionSchema.table(
  "subscriptions",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    claimId: claimIdReference(),
    status: subscriptionStatus().notNull(),
    periodEnd: timestamp(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("subscriptions_org_uidx").on(table.organizationId),
    ...subscriptionPolicies({ organizationId: table.organizationId }),
  ],
);
