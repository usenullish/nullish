import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiAccountsSsr } from "~/lib/api/accounts.ssr.api";
import { ApiAccounts } from "~/lib/api/accounts.api";
import type { ApiAccountsGetByIdArgs, ApiAccountsWritableArgs } from "~/lib/api/_accounts";
import type { Api } from "@usenullish/nullish-schema/server";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiListArgs } from "~/lib/api/_api";
import { Service } from "./_services";

export class AccountsService extends Service {
  private constructor() {
    super();
  }

  static create(): AccountsService {
    return new this();
  }

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["Accounts"]["Client"]["GetAccountsFilters"]>): Promise<
    Result<Api["Accounts"]["Client"]["GetAccountsResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiAccountsSsr.create({ cookie }).list(rest);
    });
  };

  listAll = async ({
    cookie,
    orgId,
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["Accounts"]["Client"]["GetAccountsResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiAccountsSsr.create({ cookie });

      const accounts = await this._listAll({
        listFn: async (query) => {
          const { accounts } = await api.list({ orgId, query });
          return accounts;
        },
      });

      return { accounts };
    });
  };

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiAccountsGetByIdArgs): Promise<Result<Api["Accounts"]["Client"]["GetAccountResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiAccountsSsr.create({ cookie }).getById({ id });
    });
  };

  update = async ({
    values: body,
    ...rest
  }: {
    accountId: Api["Accounts"]["Client"]["Account"]["id"];
    values: Api["Accounts"]["Client"]["UpdateAccountBody"];
  }): Promise<Result<Api["Accounts"]["Client"]["UpdateAccountResponse"]>> => {
    try {
      const result = await ApiAccounts.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  submit = async ({
    organizationId,
    account,
  }: {
    account: Api["Accounts"]["Client"]["CreateAccountBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["Accounts"]["Client"]["CreateAccountResponse"]>> => {
    try {
      const result = await ApiAccounts.create().submit({
        orgId: organizationId,
        body: account,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  delete = async ({ accountId }: ApiAccountsWritableArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiAccounts.create().delete({ accountId });
    });
  };
}
