import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";

export const VatMethodsResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Core.VatSchema.SelectVatMethodsSchema,
);

export const GetVatMethodsResponseSchema = z.strictObject({
  methods: z.array(VatMethodsResponseSchema),
});
export const GetVatMethodResponseSchema = z.strictObject({
  method: VatMethodsResponseSchema.nullish(),
});
export const CreateVatMethodResponseSchema = z.strictObject({
  method: VatMethodsResponseSchema,
});
export const UpdateVatMethodResponseSchema = CreateVatMethodResponseSchema;

export const GetVatMethodsRequestSchema = RecordsSchema.Core.VatSchema.SelectVatMethodsSchema;
export const CreateVatMethodRequestSchema = RecordsSchema.Core.VatSchema.InsertVatMethodsSchema;
export const UpdateVatMethodRequestSchema = RecordsSchema.Core.VatSchema.UpdateVatMethodsSchema;
