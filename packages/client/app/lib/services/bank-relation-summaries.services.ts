import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiBankRelationSummariesSsr } from "~/lib/api/bank-relation-summaries.ssr.api";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import { Service } from "./_services";

export class BankRelationSummariesService extends Service {
  private constructor() {
    super();
  }

  static create(): BankRelationSummariesService {
    return new this();
  }

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs): Promise<
    Result<Api["BankRelationSummaries"]["Client"]["GetBankRelationSummariesResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiBankRelationSummariesSsr.create({ cookie }).list(rest);
    });
  };
}
