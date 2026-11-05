import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { BankRelationsSchema } from "../../../db/schemas/core/bank";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";
import { IbanSchema } from "../_iban";

const refineBankRelations = {
  iban: IbanSchema,
  invoiceIban: IbanSchema.nullable(),
};

export const SelectBankRelationsSchema = createSelectSchema(
  BankRelationsSchema,
  refineBankRelations,
);
export const InsertBankRelationsSchema = createInsertSchema(
  BankRelationsSchema,
  refineBankRelations,
)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...INSERT_OMIT_FIELDS,
  })
  .partial({ invoiceIban: true });
export const UpdateBankRelationsSchema = createUpdateSchema(
  BankRelationsSchema,
  refineBankRelations,
)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);
