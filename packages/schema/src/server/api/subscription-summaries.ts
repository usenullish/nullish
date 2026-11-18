import * as z from "zod";
import { CompositesSchema } from "../../composites";
import { SubscriptionResponseSchema } from "./subscriptions";

export const SubscriptionSummarySchema = z.strictObject({
  subscription: SubscriptionResponseSchema,
  organization: CompositesSchema.SubscriptionSummariesSchema.SubscriptionOrganizationSchema,
});

export const GetSubscriptionSummariesResponseSchema = z.strictObject({
  subscriptionSummaries: z.array(SubscriptionSummarySchema),
});
