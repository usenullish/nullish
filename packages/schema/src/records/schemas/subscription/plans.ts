import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { PlansSchema } from "../../../db/schemas/subscription/plans";
import { SubscriptionProvider } from "../../../db/constants/subscriptions";

const refineSelectPlansEnums = {
  provider: z.enum(SubscriptionProvider).nullable(),
};

const refineWritePlansEnums = {
  provider: z.enum(SubscriptionProvider).nullish(),
};

export const SelectPlansSchema = createSelectSchema(PlansSchema, refineSelectPlansEnums);
export const InsertPlansSchema = createInsertSchema(PlansSchema, refineWritePlansEnums).omit({
  id: true,
});
export const UpdatePlansSchema = createUpdateSchema(PlansSchema, refineWritePlansEnums).omit({
  id: true,
});
