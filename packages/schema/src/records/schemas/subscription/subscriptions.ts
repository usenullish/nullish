import { createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { SubscriptionsSchema } from "../../../db/schemas/subscription/subscriptions";
import { SubscriptionStatus } from "../../../db/constants/subscriptions";
import {
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";

const refineSubscriptionsEnums = {
  status: z.enum(SubscriptionStatus),
};

export const SelectSubscriptionsSchema = createSelectSchema(
  SubscriptionsSchema,
  refineSubscriptionsEnums,
);
export const UpdateSubscriptionsSchema = createUpdateSchema(
  SubscriptionsSchema,
  refineSubscriptionsEnums,
)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);
