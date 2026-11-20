import * as z from "zod";
import { SelectMembershipsSchema } from "../../records/schemas/core/memberships";
import { SelectExternalProductsSchema } from "../../records/schemas/subscription/external-products";
import { SelectSubscriptionReferencesSchema } from "../../records/schemas/subscription/subscription-references";
import { SelectSubscriptionsSchema } from "../../records/schemas/subscription/subscriptions";
import { SelectSubscriptionTaxRatesSchema } from "../../records/schemas/subscription/subscription-tax-rates";
import { PaymentInterval } from "../constants";

export const HandlePaymentsArgsSchema = z.strictObject({
  payload: z.string(),
  signature: z.string(),
});

export const CheckoutPaymentsArgsSchema = z.strictObject({
  userId: SelectMembershipsSchema.shape.userId,
  organizationId: SelectSubscriptionsSchema.shape.organizationId,
  priceId: z.string().min(1),
  successUrl: z.url(),
  cancelUrl: z.url(),
});

export const PaymentCheckoutSchema = z.strictObject({
  url: z.url(),
});

export const PaymentPlanPriceSchema = z.strictObject({
  priceId: CheckoutPaymentsArgsSchema.shape.priceId,
  amount: z.bigint(),
  currency: z.currencyCode(),
  interval: z.enum(PaymentInterval),
});

export const PaymentPlanSchema = z.strictObject({
  productName: z.string(),
  prices: z.array(PaymentPlanPriceSchema).min(1),
});

export const PaymentPlansSchema = z.array(PaymentPlanSchema);

export const PaymentMetadataSchema = z.object({
  organizationId: SelectSubscriptionsSchema.shape.organizationId,
});

export const PaymentExternalIdsSchema = z.strictObject({
  subscriptionId: SelectSubscriptionReferencesSchema.shape.externalSubscriptionId,
  customerId: SelectSubscriptionReferencesSchema.shape.externalCustomerId,
  productId: SelectExternalProductsSchema.shape.externalProductId,
});

export const PaymentSchema = z.strictObject({
  organizationId: SelectSubscriptionsSchema.shape.organizationId,
  provider: SelectSubscriptionReferencesSchema.shape.provider,
  externalIds: PaymentExternalIdsSchema,
  status: SelectSubscriptionsSchema.shape.status,
  periodEnd: SelectSubscriptionsSchema.shape.periodEnd.unwrap().optional(),
});

export const PaymentInvoiceSchema = z.strictObject({
  provider: SelectSubscriptionReferencesSchema.shape.provider,
  externalIds: z.strictObject({
    invoiceId: z.string().min(1),
    subscriptionId: SelectSubscriptionReferencesSchema.shape.externalSubscriptionId,
    taxRateIds: z.array(SelectSubscriptionTaxRatesSchema.shape.externalTaxRateId),
  }),
  validOn: z.date(),
});
