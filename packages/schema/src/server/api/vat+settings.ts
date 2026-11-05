import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";

export const VatSettingsResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Core.VatSchema.SelectVatSettingsSchema,
);

export const GetVatSettingsResponseSchema = z.strictObject({
  settings: z.array(VatSettingsResponseSchema),
});
export const GetVatSettingResponseSchema = z.strictObject({
  setting: VatSettingsResponseSchema.nullish(),
});
export const CreateVatSettingResponseSchema = z.strictObject({
  setting: VatSettingsResponseSchema,
});
export const UpdateVatSettingResponseSchema = CreateVatSettingResponseSchema;

export const GetVatSettingsRequestSchema = RecordsSchema.Core.VatSchema.SelectVatSettingsSchema;
export const CreateVatSettingRequestSchema = RecordsSchema.Core.VatSchema.InsertVatSettingsSchema;
export const UpdateVatSettingRequestSchema = RecordsSchema.Core.VatSchema.UpdateVatSettingsSchema;
