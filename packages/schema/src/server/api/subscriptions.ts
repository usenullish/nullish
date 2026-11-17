import { TimestampCodec } from "@usenullish/nullish-common";
import * as z from "zod";
import { RecordsSchema } from "../../records";
import { withAuditFieldsCodecs } from "./_audit";

const SubscriptionResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Subscription.SubscriptionsSchema.SelectSubscriptionsSchema,
).extend({
  periodEnd: TimestampCodec.nullable(),
});

export const GetSubscriptionsResponseSchema = z.strictObject({
  subscriptions: z.array(SubscriptionResponseSchema),
});
