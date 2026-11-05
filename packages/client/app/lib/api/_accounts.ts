import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiAccountsGetByIdArgs {
  id: NonNullable<Api["Accounts"]["Client"]["GetAccountResponse"]["account"]>["id"];
}

export interface ApiAccountsWritableArgs {
  accountId: Api["Accounts"]["Client"]["Account"]["id"];
}
