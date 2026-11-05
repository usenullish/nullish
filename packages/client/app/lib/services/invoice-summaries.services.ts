import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiInvoiceSummariesSsr } from "~/lib/api/invoice-summaries.ssr.api";
import type { ApiInvoicesGetByIdArgs } from "~/lib/api/_invoices";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import { Service } from "./_services";

export class InvoiceSummariesService extends Service {
  private constructor() {
    super();
  }

  static create(): InvoiceSummariesService {
    return new this();
  }

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiInvoicesGetByIdArgs): Promise<
    Result<Api["InvoiceSummaries"]["Client"]["GetInvoiceSummaryResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiInvoiceSummariesSsr.create({ cookie }).getById({ id });
    });
  };

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["InvoiceSummaries"]["Client"]["GetInvoiceSummariesFilters"]>): Promise<
    Result<Api["InvoiceSummaries"]["Client"]["GetInvoiceSummariesResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiInvoiceSummariesSsr.create({ cookie }).list(rest);
    });
  };
}
