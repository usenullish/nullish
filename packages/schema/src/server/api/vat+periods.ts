import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";
import { DateCodec } from "@usenullish/nullish-common";

const withStartEndCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    startOn: DateCodec,
    endOn: DateCodec,
  });

const withOptionalStartEndCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    startOn: DateCodec.optional(),
    endOn: DateCodec.optional(),
  });

export const VatPeriodsResponseSchema = withStartEndCodecs(
  withAuditFieldsCodecs(RecordsSchema.Core.VatSchema.SelectVatPeriodsSchema),
);

export const GetVatPeriodsResponseSchema = z.strictObject({
  periods: z.array(VatPeriodsResponseSchema),
});
export const GetVatPeriodResponseSchema = z.strictObject({
  period: VatPeriodsResponseSchema.nullish(),
});
export const CreateVatPeriodResponseSchema = z.strictObject({
  period: VatPeriodsResponseSchema,
});
export const UpdateVatPeriodResponseSchema = CreateVatPeriodResponseSchema;

export const GetVatPeriodsRequestSchema = withStartEndCodecs(
  RecordsSchema.Core.VatSchema.SelectVatPeriodsSchema,
);
export const CreateVatPeriodRequestSchema = withStartEndCodecs(
  RecordsSchema.Core.VatSchema.InsertVatPeriodsSchema,
);
export const UpdateVatPeriodRequestSchema = withOptionalStartEndCodecs(
  RecordsSchema.Core.VatSchema.UpdateVatPeriodsSchema,
);

export const GetVatPeriodsFiltersSchema = RecordsSchema.Core.VatSchema.FilterVatPeriodsSchema;
export const GetVatPeriodsFiltersQuerySchema = GetVatPeriodsFiltersSchema;
