import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { BankRelationSummariesService } from "~/lib/services/bank-relation-summaries.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class BankRelationSummariesServer extends ServerLoader {
  #service = BankRelationSummariesService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): BankRelationSummariesServer {
    return new BankRelationSummariesServer({ context: "bank-relation-summaries" });
  }

  async listBankRelationSummaries(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["BankRelationSummaries"]["Client"]["GetBankRelationSummariesResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the bank accounts",
      defaultSort: { field: "createdAt", direction: "asc" },
      loaderWithOrgIdFn: this.#service.list,
    });
  }
}
