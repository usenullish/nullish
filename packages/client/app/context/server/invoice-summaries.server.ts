import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { InvoiceSummariesService } from "~/lib/services/invoice-summaries.services";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class InvoiceSummariesServer extends ServerLoader {
  #service = InvoiceSummariesService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): InvoiceSummariesServer {
    return new InvoiceSummariesServer({ context: "invoice-summaries" });
  }

  async getInvoiceSummary(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["InvoiceSummaries"]["Client"]["GetInvoiceSummaryResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the invoice summary",
        missingId: "Missing invoice ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }

  async listInvoiceSummaries(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["InvoiceSummaries"]["Client"]["GetInvoiceSummariesResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the invoices",
      defaultSort: { field: "issueOn", direction: "desc" },
      filtersSchema: ApiSchema.InvoiceSummaries.GetInvoiceSummariesFiltersQuerySchema,
      loaderWithOrgIdFn: this.#service.list,
    });
  }
}
