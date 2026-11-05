import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";

export const AccountsResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema,
);

export const GetAccountsResponseSchema = z.strictObject({
  accounts: z.array(AccountsResponseSchema),
});
export const GetAccountResponseSchema = z.strictObject({
  account: AccountsResponseSchema.nullish(),
});
export const CreateAccountResponseSchema = z.strictObject({
  account: AccountsResponseSchema,
});
export const UpdateAccountResponseSchema = CreateAccountResponseSchema;

export const GetAccountsRequestSchema = RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema;
export const CreateAccountRequestSchema = RecordsSchema.Ledger.AccountsSchema.InsertAccountsSchema;
export const UpdateAccountRequestSchema = RecordsSchema.Ledger.AccountsSchema.UpdateAccountsSchema;

export const GetAccountsFiltersSchema = RecordsSchema.Ledger.AccountsSchema.FilterAccountsSchema;
export const GetAccountsFiltersQuerySchema = GetAccountsFiltersSchema;
