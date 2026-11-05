import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiSystemAccountsGetByIdArgs {
  id: NonNullable<Api["SystemAccounts"]["Client"]["GetSystemAccountResponse"]["account"]>["id"];
}

export interface ApiSystemAccountsWritableArgs {
  systemAccountId: Api["SystemAccounts"]["Client"]["SystemAccount"]["id"];
}
