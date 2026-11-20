import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { ExternalProductsSchema } from "../../../db/schemas/subscription/external-products";
import { SubscriptionProvider } from "../../../db/constants/subscriptions";

const refineExternalProductsEnums = {
  provider: z.enum(SubscriptionProvider),
};

export const SelectExternalProductsSchema = createSelectSchema(
  ExternalProductsSchema,
  refineExternalProductsEnums,
);
export const InsertExternalProductsSchema = createInsertSchema(
  ExternalProductsSchema,
  refineExternalProductsEnums,
).omit({
  id: true,
});
