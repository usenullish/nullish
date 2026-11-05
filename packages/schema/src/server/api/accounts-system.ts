import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";

export const SystemAccountSchema = withAuditFieldsCodecs(
  RecordsSchema.Ledger.SystemAccountsSchema.SelectSystemAccountsSchema,
);

export const GetSystemAccountsResponseSchema = z.strictObject({
  accounts: z.array(SystemAccountSchema),
});
export const GetSystemAccountResponseSchema = z.strictObject({
  account: SystemAccountSchema.nullish(),
});
export const CreateSystemAccountResponseSchema = z.strictObject({
  account: SystemAccountSchema,
});
export const UpdateSystemAccountResponseSchema = CreateSystemAccountResponseSchema;

export const GetSystemAccountsRequestSchema =
  RecordsSchema.Ledger.SystemAccountsSchema.SelectSystemAccountsSchema;
export const CreateSystemAccountRequestSchema =
  RecordsSchema.Ledger.SystemAccountsSchema.InsertSystemAccountsSchema;
export const UpdateSystemAccountRequestSchema =
  RecordsSchema.Ledger.SystemAccountsSchema.UpdateSystemAccountsSchema;

export const GetSystemAccountsFiltersSchema =
  RecordsSchema.Ledger.SystemAccountsSchema.FilterSystemAccountsSchema;
export const GetSystemAccountsFiltersQuerySchema = GetSystemAccountsFiltersSchema;
