import { RecordsSchema } from "../../records";
import * as z from "zod";
import { PaginationResponseSchema } from "../common/query";
import { withAuditFieldsCodecs } from "./_audit";

const BillingSettingsResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Core.BillingSchema.SelectBillingSettingsSchema,
);

export const GetBillingSettingsResponseSchema = z.strictObject({
  data: z.array(BillingSettingsResponseSchema),
  pagination: PaginationResponseSchema.optional(),
});
export const GetBillingSettingResponseSchema = z.strictObject({
  setting: BillingSettingsResponseSchema.nullish(),
});
export const CreateBillingSettingResponseSchema = z.strictObject({
  setting: BillingSettingsResponseSchema,
});
export const UpdateBillingSettingResponseSchema = CreateBillingSettingResponseSchema;

export const GetBillingSettingsRequestSchema =
  RecordsSchema.Core.BillingSchema.SelectBillingSettingsSchema;
export const CreateBillingSettingRequestSchema =
  RecordsSchema.Core.BillingSchema.InsertBillingSettingsSchema;
export const UpdateBillingSettingRequestSchema =
  RecordsSchema.Core.BillingSchema.UpdateBillingSettingsSchema;
