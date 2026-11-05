import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { AccountsSchema } from "../../../db/schemas/ledger/accounts";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";
import * as z from "zod";
import { AccountType } from "../../../db";
import { NotEmptyStringSchema } from "@usenullish/nullish-common";

// Drizzle does not correctly infer the enum
const refineAccountTypesEnums = {
  type: z.enum(AccountType),
};

export const SelectAccountsSchema = createSelectSchema(AccountsSchema, refineAccountTypesEnums);
export const InsertAccountsSchema = createInsertSchema(
  AccountsSchema,
  refineAccountTypesEnums,
).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  ...INSERT_OMIT_FIELDS,
});
export const UpdateAccountsSchema = createUpdateSchema(AccountsSchema, refineAccountTypesEnums)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);

export const FilterAccountsSchema = z.strictObject({
  type: refineAccountTypesEnums.type.optional(),
  parentId: SelectAccountsSchema.shape.parentId.unwrap().optional(),
  search: NotEmptyStringSchema.optional(),
});
