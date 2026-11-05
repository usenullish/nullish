import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { ClientsService } from "~/lib/services/clients.services";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class ClientsServer extends ServerLoader {
  #service = ClientsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): ClientsServer {
    return new ClientsServer({ context: "clients" });
  }

  async getClient(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Clients"]["Client"]["GetClientResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the client",
        missingId: "Missing client ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }

  async listClients(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Clients"]["Client"]["GetClientsResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the clients",
      defaultSort: { field: "name", direction: "asc" },
      filtersSchema: ApiSchema.Clients.GetClientsFiltersQuerySchema,
      loaderWithOrgIdFn: this.#service.list,
    });
  }

  async listAll(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Clients"]["Client"]["GetClientsResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the clients",
      loaderWithOrgIdFn: this.#service.listAll,
    });
  }
}
