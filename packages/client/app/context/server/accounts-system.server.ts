import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { SystemAccountsService } from "~/lib/services/accounts-system.services";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class SystemAccountsServer extends ServerLoader {
  #service = SystemAccountsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): SystemAccountsServer {
    return new SystemAccountsServer({ context: "system-accounts" });
  }

  async listSystemAccounts(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["SystemAccounts"]["Client"]["GetSystemAccountsResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the system-accounts",
      defaultSort: { field: "createdAt", direction: "asc" },
      filtersSchema: ApiSchema.SystemAccounts.GetSystemAccountsFiltersQuerySchema,
      loaderWithOrgIdFn: this.#service.list,
    });
  }

  async getSystemAccount(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["SystemAccounts"]["Client"]["GetSystemAccountResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the system-account",
        missingId: "Missing system-account ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }
}
