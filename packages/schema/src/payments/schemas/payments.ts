import * as z from "zod";
import { SelectClaimsSchema } from "../../records/schemas/subscription/claims";
import { SelectSubscriptionReferencesSchema } from "../../records/schemas/subscription/subscription-references";
import { SelectSubscriptionsSchema } from "../../records/schemas/subscription/subscriptions";

export const HandlePaymentEventArgsSchema = z.strictObject({
  payload: z.string(),
  signature: z.string(),
});

export const PaymentExternalIdsSchema = z.strictObject({
  subscriptionId:
    SelectSubscriptionReferencesSchema.shape.externalSubscriptionId,
  customerId: SelectSubscriptionReferencesSchema.shape.externalCustomerId,
  productId: SelectClaimsSchema.shape.externalProductId.unwrap(),
});

export const PaymentSchema = z.strictObject({
  organizationId: SelectSubscriptionsSchema.shape.organizationId.optional(),
  provider: SelectSubscriptionReferencesSchema.shape.provider,
  externalIds: PaymentExternalIdsSchema,
  status: SelectSubscriptionsSchema.shape.status,
  periodEnd: SelectSubscriptionsSchema.shape.periodEnd.unwrap().optional(),
});