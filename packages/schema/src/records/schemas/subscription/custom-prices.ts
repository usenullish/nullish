import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { CustomPricesSchema } from "../../../db/schemas/subscription/custom-prices";
import { PaymentInterval } from "../../../payments/constants";

const refineCustomPricesEnums = {
  billingPeriod: z.enum(PaymentInterval),
};

export const SelectCustomPricesSchema = createSelectSchema(
  CustomPricesSchema,
  refineCustomPricesEnums,
);
export const InsertCustomPricesSchema = createInsertSchema(
  CustomPricesSchema,
  refineCustomPricesEnums,
).omit({
  id: true,
});
