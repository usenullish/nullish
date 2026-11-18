import * as z from "zod";
import { OrganizationSubscriptionStatus } from "../../db/constants/subscriptions";
import { RecordsSchema } from "../../records";

export const SubscriptionOrganizationSchema = z.strictObject({
  status: z.enum(OrganizationSubscriptionStatus),
});

export const SelectSubscriptionSummariesSchema = z.strictObject({
  subscription: RecordsSchema.Subscription.SubscriptionsSchema.SelectSubscriptionsSchema,
  organization: SubscriptionOrganizationSchema,
});
