import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiVatPeriodsSsr } from "~/lib/api/vat+periods.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiVatPeriods } from "~/lib/api/vat+periods.api";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiVatPeriodsGetByIdArgs } from "~/lib/api/_vat+periods";
import { Service } from "./_services";

export class VatPeriodsService extends Service {
  private constructor() {
    super();
  }

  static create(): VatPeriodsService {
    return new this();
  }

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiVatPeriodsGetByIdArgs): Promise<
    Result<Api["VatPeriods"]["Client"]["GetVatPeriodResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiVatPeriodsSsr.create({ cookie }).getById({ id });
    });
  };

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["VatPeriods"]["Client"]["GetVatPeriodsFilters"]>): Promise<
    Result<Api["VatPeriods"]["Client"]["GetVatPeriodsResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiVatPeriodsSsr.create({ cookie }).list(rest);
    });
  };

  listAll = async ({
    cookie,
    orgId,
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["VatPeriods"]["Client"]["GetVatPeriodsResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiVatPeriodsSsr.create({ cookie });

      const periods = await this._listAll({
        listFn: async (query) => {
          const { periods } = await api.list({ orgId, query });
          return periods;
        },
      });

      return { periods };
    });
  };

  submit = async ({
    period,
    organizationId,
  }: {
    period: Api["VatPeriods"]["Client"]["CreateVatPeriodBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["VatPeriods"]["Client"]["CreateVatPeriodResponse"]>> => {
    try {
      const result = await ApiVatPeriods.create().submit({
        body: period,
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
    vatPeriodId: Api["VatPeriods"]["Client"]["VatPeriod"]["id"];
    values: Api["VatPeriods"]["Client"]["UpdateVatPeriodBody"];
  }): Promise<Result<Api["VatPeriods"]["Client"]["UpdateVatPeriodResponse"]>> => {
    try {
      const result = await ApiVatPeriods.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };
}
