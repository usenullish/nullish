import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { BankMovementsService } from "~/lib/services/bank-movements.services";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { isEmptyString, type Option } from "@usenullish/nullish-common";

export class BankMovementsServer extends ServerLoader {
  #service = BankMovementsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): BankMovementsServer {
    return new BankMovementsServer({ context: "bank-movements" });
  }

  async getMovement(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["BankMovements"]["Client"]["GetBankMovementResponse"]>> {
    const movementId = args.params["movement-id"];

    if (isEmptyString(movementId)) {
      return undefined;
    }

    return await this._load({
      args,
      errorFallbackMsg: "Unexpected error while loading the bank movement",
      loaderFn: async ({ cookie }) => await this.#service.getById({ cookie, id: movementId }),
    });
  }

  async listMovementsByBankRelationId(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["BankMovements"]["Client"]["GetBankMovementsResponse"]>> {
    return await this._loadListWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the movements of the bank account",
        missingId: "Missing bank account ID",
      },
      defaultSort: { field: "bookedOn", direction: "desc" },
      filtersSchema: ApiSchema.BankMovements.GetBankMovementsFiltersQuerySchema,
      loaderWithIdFn: this.#service.list,
    });
  }
}
