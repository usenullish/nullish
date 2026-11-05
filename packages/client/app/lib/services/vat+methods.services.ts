import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiVatMethodsSsr } from "~/lib/api/vat+methods.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiVatMethodsGetByIdArgs } from "~/lib/api/_vat+methods";
import { ApiVatMethods } from "~/lib/api/vat+methods.api";
import { Service } from "./_services";

export class VatMethodsService extends Service {
  private constructor() {
    super();
  }

  static create(): VatMethodsService {
    return new this();
  }

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiVatMethodsGetByIdArgs): Promise<
    Result<Api["VatMethods"]["Client"]["GetVatMethodResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiVatMethodsSsr.create({ cookie }).getById({ id });
    });
  };

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs): Promise<Result<Api["VatMethods"]["Client"]["GetVatMethodsResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiVatMethodsSsr.create({ cookie }).list(rest);
    });
  };

  listAll = async ({
    cookie,
    orgId,
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["VatMethods"]["Client"]["GetVatMethodsResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiVatMethodsSsr.create({ cookie });

      const methods = await this._listAll({
        listFn: async (query) => {
          const { methods } = await api.list({ orgId, query });
          return methods;
        },
      });

      return { methods };
    });
  };

  submit = async ({
    method,
    organizationId,
  }: {
    method: Api["VatMethods"]["Client"]["CreateVatMethodBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["VatMethods"]["Client"]["CreateVatMethodResponse"]>> => {
    try {
      const result = await ApiVatMethods.create().submit({
        body: method,
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
    vatMethodId: Api["VatMethods"]["Client"]["VatMethod"]["id"];
    values: Api["VatMethods"]["Client"]["UpdateVatMethodBody"];
  }): Promise<Result<Api["VatMethods"]["Client"]["UpdateVatMethodResponse"]>> => {
    try {
      const result = await ApiVatMethods.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };
}
