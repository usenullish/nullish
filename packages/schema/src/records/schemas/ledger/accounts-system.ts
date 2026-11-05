import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { SystemAccountsSchema } from "../../../db/schemas/ledger/accounts-system";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";
import * as z from "zod";
import { SystemAccountPurpose } from "../../../db";

// Drizzle does not correctly infer the enum
const refineSystemAccountsEnums = {
  purpose: z.enum(SystemAccountPurpose),
};

export const SelectSystemAccountsSchema = createSelectSchema(
  SystemAccountsSchema,
  refineSystemAccountsEnums,
);
export const InsertSystemAccountsSchema = createInsertSchema(
  SystemAccountsSchema,
  refineSystemAccountsEnums,
).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  ...INSERT_OMIT_FIELDS,
});
export const UpdateSystemAccountsSchema = createUpdateSchema(
  SystemAccountsSchema,
  refineSystemAccountsEnums,
)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);

export const FilterSystemAccountsSchema = z.strictObject({
  purpose: refineSystemAccountsEnums.purpose.optional(),
  accountId: SelectSystemAccountsSchema.shape.accountId.optional(),
});
