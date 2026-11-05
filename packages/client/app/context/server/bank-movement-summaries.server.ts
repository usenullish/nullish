import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { BankMovementSummariesService } from "~/lib/services/bank-movement-summaries.services";
import type { Api } from "@usenullish/nullish-schema/server";
import { BankMovementStatus } from "@usenullish/nullish-schema/db";
import type { Option } from "@usenullish/nullish-common";

export class BankMovementSummariesServer extends ServerLoader {
  #service = BankMovementSummariesService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): BankMovementSummariesServer {
    return new BankMovementSummariesServer({ context: "bank-movement-summaries" });
  }

  async listUnreconciledSummariesByBankRelationId(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["BankMovementSummaries"]["Client"]["GetBankMovementSummariesResponse"]>> {
    return await this._loadListWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the movements to reconcile",
        missingId: "Missing bank account ID",
      },
      defaultSort: { field: "bookedOn", direction: "asc" },
      loaderWithIdFn: async (params) =>
        await this.#service.list({
          ...params,
          filters: { status: BankMovementStatus.UNRECONCILED },
        }),
    });
  }
}
