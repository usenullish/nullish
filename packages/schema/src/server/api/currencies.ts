import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";

export const CurrencySchema = withAuditFieldsCodecs(
  RecordsSchema.Core.CurrenciesSchema.SelectCurrenciesSchema,
);

export const GetCurrenciesResponseSchema = z.strictObject({
  currencies: z.array(CurrencySchema),
});
export const GetCurrencyResponseSchema = z.strictObject({
  currency: CurrencySchema.nullish(),
});
export const CreateCurrencyResponseSchema = z.strictObject({
  currency: CurrencySchema,
});

export const GetCurrenciesRequestSchema =
  RecordsSchema.Core.CurrenciesSchema.SelectCurrenciesSchema;
export const CreateCurrencyRequestSchema =
  RecordsSchema.Core.CurrenciesSchema.InsertCurrenciesSchema;
