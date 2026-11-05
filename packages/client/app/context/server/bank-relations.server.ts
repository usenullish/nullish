import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { BankRelationsService } from "~/lib/services/bank-relations.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class BankRelationsServer extends ServerLoader {
  #service = BankRelationsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): BankRelationsServer {
    return new BankRelationsServer({ context: "bank-relations" });
  }

  async listBankRelations(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["BankRelations"]["Client"]["GetBankRelationsResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the bank accounts",
      defaultSort: { field: "createdAt", direction: "asc" },
      loaderWithOrgIdFn: this.#service.list,
    });
  }

  async listAllBankRelations(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["BankRelations"]["Client"]["GetBankRelationsResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the bank accounts",
      loaderWithOrgIdFn: this.#service.listAll,
    });
  }

  async getBankRelation(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["BankRelations"]["Client"]["GetBankRelationResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the bank account",
        missingId: "Missing bank account ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }
}
