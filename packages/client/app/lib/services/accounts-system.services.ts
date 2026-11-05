import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiSystemAccountsSsr } from "~/lib/api/accounts-system.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import type { ApiSystemAccountsGetByIdArgs } from "~/lib/api/_accounts-system";
import { ApiSystemAccounts } from "~/lib/api/accounts-system.api";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import { Service } from "./_services";

export class SystemAccountsService extends Service {
  private constructor() {
    super();
  }

  static create(): SystemAccountsService {
    return new this();
  }

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["SystemAccounts"]["Client"]["GetSystemAccountsFilters"]>): Promise<
    Result<Api["SystemAccounts"]["Client"]["GetSystemAccountsResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiSystemAccountsSsr.create({ cookie }).list(rest);
    });
  };

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiSystemAccountsGetByIdArgs): Promise<
    Result<Api["SystemAccounts"]["Client"]["GetSystemAccountResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiSystemAccountsSsr.create({ cookie }).getById({ id });
    });
  };

  update = async ({
    values: body,
    ...rest
  }: {
    systemAccountId: Api["SystemAccounts"]["Client"]["SystemAccount"]["id"];
    values: Api["SystemAccounts"]["Client"]["UpdateSystemAccountBody"];
  }): Promise<Result<Api["SystemAccounts"]["Client"]["UpdateSystemAccountResponse"]>> => {
    try {
      const result = await ApiSystemAccounts.create().update({
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
    systemAccount,
  }: {
    systemAccount: Api["SystemAccounts"]["Client"]["CreateSystemAccountBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["SystemAccounts"]["Client"]["CreateSystemAccountResponse"]>> => {
    try {
      const result = await ApiSystemAccounts.create().submit({
        orgId: organizationId,
        body: systemAccount,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };
}
