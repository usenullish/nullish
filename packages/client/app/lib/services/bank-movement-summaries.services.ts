import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiBankMovementSummariesSsr } from "~/lib/api/bank-movement-summaries.ssr.api";
import type { ApiBankRelationsGetByIdArgs } from "~/lib/api/_bank-relations";
import { Service } from "./_services";

export class BankMovementSummariesService extends Service {
  private constructor() {
    super();
  }

  static create(): BankMovementSummariesService {
    return new this();
  }

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiBankRelationsGetByIdArgs &
    ApiListArgs<
      Api["BankMovementSummaries"]["Client"]["GetBankMovementSummariesFilters"]
    >): Promise<
    Result<Api["BankMovementSummaries"]["Client"]["GetBankMovementSummariesResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiBankMovementSummariesSsr.create({ cookie }).list(rest);
    });
  };
}
