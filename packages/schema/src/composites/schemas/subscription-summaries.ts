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
    expiresAt: z.date(),
  }),
  z.strictObject({
    status: z.literal(OrganizationSubscriptionStatus.LOCKED),
  }),
]);

export const SubscriptionPlanSchema = RecordsSchema.Subscription.PlansSchema.SelectPlansSchema.pick(
  { provider: true },
);

export const SubscriptionProductSchema =
  RecordsSchema.Subscription.ExternalProductsSchema.SelectExternalProductsSchema.pick({
    name: true,
  });

export const SelectSubscriptionSummariesSchema = z.strictObject({
  subscription: RecordsSchema.Subscription.SubscriptionsSchema.SelectSubscriptionsSchema,
  plan: SubscriptionPlanSchema,
  product: SubscriptionProductSchema.nullable(),
  organization: SubscriptionOrganizationSchema,
});
