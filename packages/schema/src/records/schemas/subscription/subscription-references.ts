import { createSelectSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { SubscriptionReferencesSchema } from "../../../db/schemas/subscription/subscription-references";
import { SubscriptionProvider } from "../../../db/constants/subscriptions";

const refineSubscriptionReferencesEnums = {
  provider: z.enum(SubscriptionProvider),
};

export const SelectSubscriptionReferencesSchema = createSelectSchema(
  SubscriptionReferencesSchema,
  refineSubscriptionReferencesEnums,
);
