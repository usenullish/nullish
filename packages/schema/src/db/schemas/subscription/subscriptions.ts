import { SubscriptionSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationIdReference } from "../core/organizations";
import { auditFields } from "../_audit";
import { timestamp } from "../_temporal";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { SubscriptionStatus } from "../../constants/subscriptions";
import { subscriptionPolicies } from "../_policies";
import { claimIdReference } from "./claims";

export const subscriptionStatus = SubscriptionSchema.enum(
  "subscription_status",
  SubscriptionStatus,
);

// The subscription of a new organization is inserted before the organization row, so that it exists
// when the other organization creation triggers run. Otherwise, every trigger that generates data
// (e.g. the default accounts) would be rejected by the policies.
//
// Drizzle cannot generate DEFERRABLE INITIALLY DEFERRED, so it is done in
// rule_subscriptions_organization_deferred.
const deferredOrganizationIdReference = () => organizationIdReference();

export const SubscriptionsSchema = SubscriptionSchema.table(
  "subscriptions",
  {
    id: primaryKey(),
    organizationId: deferredOrganizationIdReference(),
    claimId: claimIdReference(),
    status: subscriptionStatus().notNull(),
    periodEnd: timestamp(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("subscriptions_org_uidx").on(table.organizationId),
    pg.check(
      "subscriptions_past_due_period_end",
      sql`${table.status} <> 'past_due' OR ${table.periodEnd} IS NOT NULL`,
    ),
    ...subscriptionPolicies({ organizationId: table.organizationId }),
  ],
);
