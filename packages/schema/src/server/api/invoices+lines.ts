import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";
import { BigIntCodec } from "@usenullish/nullish-common";

const withUnitPriceCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    unitPrice: BigIntCodec,
  });

const LinesResponseSchema = withAuditFieldsCodecs(
  withUnitPriceCodecs(RecordsSchema.Billing.InvoicesSchema.SelectLinesSchema),
);

export const GetLinesResponseSchema = z.strictObject({
  lines: z.array(LinesResponseSchema),
});
export const GetLineResponseSchema = z.strictObject({
  line: LinesResponseSchema.nullish(),
});
export const CreateLineResponseSchema = z.strictObject({
  line: LinesResponseSchema,
});
export const UpdateLineResponseSchema = CreateLineResponseSchema;

export const GetLinesRequestSchema = RecordsSchema.Billing.InvoicesSchema.SelectLinesSchema;
export const CreateLineRequestSchema = withUnitPriceCodecs(
  RecordsSchema.Billing.InvoicesSchema.InsertLinesSchema,
);
export const UpdateLineRequestSchema = withUnitPriceCodecs(
  RecordsSchema.Billing.InvoicesSchema.UpdateLinesSchema,
);

export const GetLinesFiltersSchema = RecordsSchema.Billing.InvoicesSchema.FilterLinesSchema;
export const GetLinesFiltersQuerySchema = GetLinesFiltersSchema;
