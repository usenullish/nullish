import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { AccountsService } from "~/lib/services/accounts.services";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class AccountsServer extends ServerLoader {
  #service = AccountsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): AccountsServer {
    return new AccountsServer({ context: "accounts" });
  }

  async list(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Accounts"]["Client"]["GetAccountsResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the accounts",
      defaultSort: { field: "code", direction: "asc" },
      filtersSchema: ApiSchema.Accounts.GetAccountsFiltersQuerySchema,
      loaderWithOrgIdFn: this.#service.list,
    });
  }

  async listAll(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Accounts"]["Client"]["GetAccountsResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the accounts",
      loaderWithOrgIdFn: this.#service.listAll,
    });
  }

  async getAccount(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Accounts"]["Client"]["GetAccountResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the account",
        missingId: "Missing account ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }
}
