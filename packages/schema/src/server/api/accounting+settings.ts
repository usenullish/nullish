import { RecordsSchema } from "../../records";
import * as z from "zod";
import { PaginationResponseSchema } from "../common/query";
import { withAuditFieldsCodecs } from "./_audit";

export const AccountingSettingsResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Core.AccountingSchema.SelectAccountingSettingsSchema,
);

export const GetAccountingSettingsResponseSchema = z.strictObject({
  data: z.array(AccountingSettingsResponseSchema),
  pagination: PaginationResponseSchema.optional(),
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
