import { createSelectSchema } from "drizzle-orm/zod";
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
