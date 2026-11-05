import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";
import { DateCodec, DateStringCodec } from "@usenullish/nullish-common";

const withStartEndCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    startOn: DateCodec,
    endOn: DateCodec.nullable(),
  });

const withOptionalStartEndCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    startOn: DateCodec.optional(),
    endOn: DateCodec.nullish(),
  });

export const VatRatesResponseSchema = withStartEndCodecs(
  withAuditFieldsCodecs(RecordsSchema.Core.VatSchema.SelectVatRatesSchema),
);

export const GetVatRatesResponseSchema = z.strictObject({
  rates: z.array(VatRatesResponseSchema),
});
export const GetVatRateResponseSchema = z.strictObject({
  rate: VatRatesResponseSchema.nullish(),
});
export const CreateVatRateResponseSchema = z.strictObject({
  rate: VatRatesResponseSchema,
});
export const UpdateVatRateResponseSchema = CreateVatRateResponseSchema;

export const GetVatRatesRequestSchema = withStartEndCodecs(
  RecordsSchema.Core.VatSchema.SelectVatRatesSchema,
);
export const CreateVatRateRequestSchema = withStartEndCodecs(
  RecordsSchema.Core.VatSchema.InsertVatRatesSchema,
);
export const UpdateVatRateRequestSchema = withOptionalStartEndCodecs(
  RecordsSchema.Core.VatSchema.UpdateVatRatesSchema,
);

export const GetVatRatesFiltersSchema = RecordsSchema.Core.VatSchema.FilterVatRatesSchema.extend({
  validOn: DateCodec.optional(),
});
export const GetVatRatesFiltersQuerySchema =
  RecordsSchema.Core.VatSchema.FilterVatRatesSchema.extend({
    validOn: DateStringCodec.optional(),
  });
