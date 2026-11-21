import { TimestampCodec } from "@usenullish/nullish-common";
import { RecordsSchema } from "../../records";
import { withAuditFieldsCodecs } from "./_audit";

export const SubscriptionResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Subscription.SubscriptionsSchema.SelectSubscriptionsSchema,
).extend({
  periodEnd: TimestampCodec.nullable(),
  cancelAt: TimestampCodec.nullable(),
});
