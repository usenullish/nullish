import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { CustomProductsSchema } from "../../../db/schemas/subscription/custom-products";
import { SubscriptionProvider } from "../../../db/constants/subscriptions";

const refineCustomProductsEnums = {
  provider: z.enum(SubscriptionProvider),
};

export const SelectCustomProductsSchema = createSelectSchema(
  CustomProductsSchema,
  refineCustomProductsEnums,
);
export const InsertCustomProductsSchema = createInsertSchema(
  CustomProductsSchema,
  refineCustomProductsEnums,
).omit({
  id: true,
});
