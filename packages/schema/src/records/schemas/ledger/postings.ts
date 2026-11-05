import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { PostingsSchema } from "../../../db/schemas/ledger/journal";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";
import { refineCurrencyValue, refineExchangeRate } from "../../../db/_refine";

const refineAmounts = {
  debit: refineCurrencyValue,
  credit: refineCurrencyValue,
  exchangeRate: refineExchangeRate,
};

const refineOptionalAmounts = {
  debit: refineAmounts.debit.optional(),
  credit: refineAmounts.credit.optional(),
  exchangeRate: refineAmounts.exchangeRate.optional(),
};

export const SelectPostingsSchema = createSelectSchema(PostingsSchema, refineAmounts).omit(
  ORGANIZATION_ID_OMIT_FIELD,
);
export const InsertPostingsSchema = createInsertSchema(PostingsSchema, refineOptionalAmounts).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  ...INSERT_OMIT_FIELDS,
});
export const UpdatePostingsSchema = createUpdateSchema(PostingsSchema, refineOptionalAmounts)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
    journalEntryId: true,
  })
  .required(UPDATE_REQUIRED_FIELDS);
