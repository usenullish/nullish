import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { CurrenciesSchema } from "../../../db/schemas/core/currencies";
import { INSERT_OMIT_FIELDS } from "../../../primitives";
import { CurrencyType } from "../../../db";
import * as z from "zod";

// Primary key of currencies is "code"
const { id: _, ...omitInsert } = INSERT_OMIT_FIELDS;

// Drizzle does not correctly infer the enum
const refineCurrencyTypeEnums = {
  type: z.enum(CurrencyType),
};

export const SelectCurrenciesSchema = createSelectSchema(CurrenciesSchema, refineCurrencyTypeEnums);
export const InsertCurrenciesSchema = createInsertSchema(CurrenciesSchema, {
  type: refineCurrencyTypeEnums.type.optional(),
}).omit({
  ...omitInsert,
  code: true,
});
// No update for currencies supported
