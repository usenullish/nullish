import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";
import { DateCodec } from "@usenullish/nullish-common";

const withStartEndCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    startOn: DateCodec,
    endOn: DateCodec,
  });

const withOptionalStartCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    startOn: DateCodec.optional(),
    endOn: DateCodec.optional(),
  });

export const PeriodsResponseSchema = withStartEndCodecs(
  withAuditFieldsCodecs(RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema),
);

export const GetPeriodsResponseSchema = z.strictObject({
  periods: z.array(PeriodsResponseSchema),
});
export const GetPeriodResponseSchema = z.strictObject({
  period: PeriodsResponseSchema.nullish(),
});
export const CreatePeriodResponseSchema = z.strictObject({
  period: PeriodsResponseSchema,
});
export const UpdatePeriodResponseSchema = CreatePeriodResponseSchema;

export const GetPeriodsRequestSchema = withStartEndCodecs(
  RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema,
);
export const CreatePeriodRequestSchema = withStartEndCodecs(
  RecordsSchema.Ledger.PeriodsSchema.InsertPeriodsSchema,
);
export const UpdatePeriodRequestSchema = withOptionalStartCodecs(
  RecordsSchema.Ledger.PeriodsSchema.UpdatePeriodsSchema.omit({ status: true }),
);

export const GetPeriodsFiltersSchema = RecordsSchema.Ledger.PeriodsSchema.FilterPeriodsSchema;
export const GetPeriodsFiltersQuerySchema = GetPeriodsFiltersSchema;
