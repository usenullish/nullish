import { createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { SubscriptionSettingsSchema } from "../../../db/schemas/subscription/subscription-settings";

export const SelectSubscriptionSettingsSchema = createSelectSchema(SubscriptionSettingsSchema);
export const UpdateSubscriptionSettingsSchema = createUpdateSchema(SubscriptionSettingsSchema).omit(
  { id: true },
);
