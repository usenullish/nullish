import * as z from "zod";
import { OrganizationSubscriptionStatus } from "../../db/constants/subscriptions";
import { RecordsSchema } from "../../records";

export const SubscriptionOrganizationSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal(OrganizationSubscriptionStatus.OPEN),
    expiresAt: z.date().nullable(),
  }),
  z.strictObject({
    status: z.literal(OrganizationSubscriptionStatus.GRACE),
    expiresAt: z.date().nullable(),
  }),
  z.strictObject({
    status: z.literal(OrganizationSubscriptionStatus.LOCKED),
  }),
]);

export const SelectSubscriptionSummariesSchema = z.strictObject({
  subscription: RecordsSchema.Subscription.SubscriptionsSchema.SelectSubscriptionsSchema,
  organization: SubscriptionOrganizationSchema,
});
