import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";

const AccountingSettingsResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Core.AccountingSchema.SelectAccountingSettingsSchema,
);

export const GetAccountingSettingsResponseSchema = z.strictObject({
  settings: z.array(AccountingSettingsResponseSchema),
});
export const GetAccountingSettingResponseSchema = z.strictObject({
  setting: AccountingSettingsResponseSchema.nullish(),
});
export const CreateAccountingSettingResponseSchema = z.strictObject({
  setting: AccountingSettingsResponseSchema,
});
export const UpdateAccountingSettingResponseSchema = CreateAccountingSettingResponseSchema;

export const GetAccountingSettingsRequestSchema =
  RecordsSchema.Core.AccountingSchema.SelectAccountingSettingsSchema;
export const CreateAccountingSettingRequestSchema =
  RecordsSchema.Core.AccountingSchema.InsertAccountingSettingsSchema;
export const UpdateAccountingSettingRequestSchema =
  RecordsSchema.Core.AccountingSchema.UpdateAccountingSettingsSchema;
