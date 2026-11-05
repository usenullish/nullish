import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiVatRatesSsr } from "~/lib/api/vat+rates.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiVatRates } from "~/lib/api/vat+rates.api";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiVatRatesGetByIdArgs } from "~/lib/api/_vat+rates";
import { Service } from "./_services";

export class VatRatesService extends Service {
  private constructor() {
    super();
  }

  static create(): VatRatesService {
    return new this();
  }

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiVatRatesGetByIdArgs): Promise<Result<Api["VatRates"]["Client"]["GetVatRateResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiVatRatesSsr.create({ cookie }).getById({ id });
    });
  };

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["VatRates"]["Client"]["GetVatRatesFilters"]>): Promise<
    Result<Api["VatRates"]["Client"]["GetVatRatesResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiVatRatesSsr.create({ cookie }).list(rest);
    });
  };

  listAll = async ({
    cookie,
    orgId,
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["VatRates"]["Client"]["GetVatRatesResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiVatRatesSsr.create({ cookie });

      const rates = await this._listAll({
        listFn: async (query) => {
          const { rates } = await api.list({ orgId, query });
          return rates;
        },
      });

      return { rates };
    });
  };

  submit = async ({
    rate,
    organizationId,
  }: {
    rate: Api["VatRates"]["Client"]["CreateVatRateBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["VatRates"]["Client"]["CreateVatRateResponse"]>> => {
    try {
      const result = await ApiVatRates.create().submit({
        body: rate,
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
    vatRateId: Api["VatRates"]["Client"]["VatRate"]["id"];
    values: Api["VatRates"]["Client"]["UpdateVatRateBody"];
  }): Promise<Result<Api["VatRates"]["Client"]["UpdateVatRateResponse"]>> => {
    try {
      const result = await ApiVatRates.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };
}
