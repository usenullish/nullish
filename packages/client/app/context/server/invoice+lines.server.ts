import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";
import { LinesService } from "~/lib/services/invoices+lines.services";

export class LinesServer extends ServerLoader {
  #service = LinesService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): LinesServer {
    return new LinesServer({ context: "invoice+lines" });
  }

  async listLinesByInvoiceId(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["InvoicesLines"]["Client"]["GetLinesResponse"]>> {
    return await this._loadListWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the lines of the invoice",
        missingId: "Missing invoice ID",
      },
      defaultSort: { field: "createdAt", direction: "asc" },
      filtersSchema: ApiSchema.Lines.GetLinesFiltersQuerySchema,
      loaderWithIdFn: this.#service.list,
    });
  }
}
