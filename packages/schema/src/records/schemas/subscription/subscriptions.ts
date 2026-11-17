import { createSelectSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { SubscriptionsSchema } from "../../../db/schemas/subscription/subscriptions";
import { SubscriptionStatus } from "../../../db/constants/subscriptions";

const refineSubscriptionsEnums = {
  status: z.enum(SubscriptionStatus),
};

export const SelectSubscriptionsSchema = createSelectSchema(
  SubscriptionsSchema,
  refineSubscriptionsEnums,
);
