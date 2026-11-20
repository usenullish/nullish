import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { PlansSchema } from "../../../db/schemas/subscription/plans";
import { SubscriptionProvider } from "../../../db/constants/subscriptions";

const refinePlansEnums = {
  provider: z.enum(SubscriptionProvider),
};

export const SelectPlansSchema = createSelectSchema(PlansSchema, refinePlansEnums);
export const InsertPlansSchema = createInsertSchema(PlansSchema, refinePlansEnums).omit({
  id: true,
});
export const UpdatePlansSchema = createUpdateSchema(PlansSchema, refinePlansEnums).omit({
  id: true,
  provider: true,
});
