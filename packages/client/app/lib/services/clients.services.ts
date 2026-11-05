import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiClientsSsr } from "~/lib/api/clients.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiClients } from "~/lib/api/clients.api";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiClientsGetByIdArgs } from "~/lib/api/_clients";
import { Service } from "./_services";

export class ClientsService extends Service {
  private constructor() {
    super();
  }

  static create(): ClientsService {
    return new this();
  }

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiClientsGetByIdArgs): Promise<Result<Api["Clients"]["Client"]["GetClientResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiClientsSsr.create({ cookie }).getById({ id });
    });
  };

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["Clients"]["Client"]["GetClientsFilters"]>): Promise<
    Result<Api["Clients"]["Client"]["GetClientsResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiClientsSsr.create({ cookie }).list(rest);
    });
  };

  listAll = async ({
    cookie,
    orgId,
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["Clients"]["Client"]["GetClientsResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiClientsSsr.create({ cookie });

      const clients = await this._listAll({
        listFn: async (query) => {
          const { clients } = await api.list({ orgId, query });
          return clients;
        },
      });

      return { clients };
    });
  };

  submit = async ({
    client,
    organizationId,
  }: {
    client: Api["Clients"]["Client"]["CreateClientBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["Clients"]["Client"]["CreateClientResponse"]>> => {
    try {
      const result = await ApiClients.create().submit({
        body: client,
        orgId: organizationId,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  update = async ({
    values: body,
    ...rest
  }: {
    values: Api["Clients"]["Client"]["UpdateClientBody"];
  } & ApiClientsGetByIdArgs): Promise<Result<Api["Clients"]["Client"]["UpdateClientResponse"]>> => {
    try {
      const result = await ApiClients.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  delete = async ({ id }: ApiClientsGetByIdArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiClients.create().delete({ id });
    });
  };
}
