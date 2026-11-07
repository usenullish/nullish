import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiVatMethodSummariesSsr } from "~/lib/api/vat-method-summaries.ssr.api";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import { Service } from "./_services";

export class VatMethodSummariesService extends Service {
  private constructor() {
    super();
  }

  static create(): VatMethodSummariesService {
    return new this();
  }

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs): Promise<
    Result<Api["VatMethodSummaries"]["Client"]["GetVatMethodSummariesResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiVatMethodSummariesSsr.create({ cookie }).list(rest);
    });
  };
}
