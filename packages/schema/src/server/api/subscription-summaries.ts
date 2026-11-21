import { TimestampCodec } from "@usenullish/nullish-common";
import * as z from "zod";
import { OrganizationSubscriptionStatus } from "../../db/constants/subscriptions";
import { SubscriptionResponseSchema } from "./subscriptions";
import { CompositesSchema } from "../../composites";

const SubscriptionOrganizationResponseSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal(OrganizationSubscriptionStatus.OPEN),
    expiresAt: TimestampCodec.nullable(),
  }),
  z.strictObject({
    status: z.literal(OrganizationSubscriptionStatus.GRACE),
    expiresAt: TimestampCodec,
  }),
  z.strictObject({
    status: z.literal(OrganizationSubscriptionStatus.LOCKED),
  }),
]);

export const SubscriptionSummarySchema = z.strictObject({
  subscription: SubscriptionResponseSchema,
  plan: CompositesSchema.SubscriptionSummariesSchema.SubscriptionPlanSchema,
  organization: SubscriptionOrganizationResponseSchema,
});

export const GetSubscriptionSummariesResponseSchema = z.strictObject({
  subscriptionSummaries: z.array(SubscriptionSummarySchema),
});
