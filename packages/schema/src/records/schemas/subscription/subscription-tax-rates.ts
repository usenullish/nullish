import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { SubscriptionTaxRatesSchema } from "../../../db/schemas/subscription/subscription-tax-rates";
import { SubscriptionProvider } from "../../../db/constants/subscriptions";

const refineSubscriptionTaxRatesEnums = {
  provider: z.enum(SubscriptionProvider),
};

export const SelectSubscriptionTaxRatesSchema = createSelectSchema(
  SubscriptionTaxRatesSchema,
  refineSubscriptionTaxRatesEnums,
);
export const InsertSubscriptionTaxRatesSchema = createInsertSchema(
  SubscriptionTaxRatesSchema,
  refineSubscriptionTaxRatesEnums,
).omit({
  id: true,
});
export const UpdateSubscriptionTaxRatesSchema = createUpdateSchema(
  SubscriptionTaxRatesSchema,
  refineSubscriptionTaxRatesEnums,
)
  .omit({
    id: true,
  })
  .partial();
