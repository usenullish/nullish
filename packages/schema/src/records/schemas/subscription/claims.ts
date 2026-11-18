import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { ClaimsSchema } from "../../../db/schemas/subscription/claims";
import { SubscriptionProvider } from "../../../db/constants/subscriptions";

const refineSelectClaimsEnums = {
  provider: z.enum(SubscriptionProvider).nullable(),
};

const refineWriteClaimsEnums = {
  provider: z.enum(SubscriptionProvider).nullish(),
};

export const SelectClaimsSchema = createSelectSchema(ClaimsSchema, refineSelectClaimsEnums);
export const InsertClaimsSchema = createInsertSchema(ClaimsSchema, refineWriteClaimsEnums).omit({
  id: true,
});
export const UpdateClaimsSchema = createUpdateSchema(ClaimsSchema, refineWriteClaimsEnums).omit({
  id: true,
});
