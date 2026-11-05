import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiPeriodsSsr } from "~/lib/api/periods.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiPeriods } from "~/lib/api/periods.api";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiPeriodsGetByIdArgs } from "~/lib/api/_periods";
import { Service } from "./_services";

export class PeriodsService extends Service {
  private constructor() {
    super();
  }

  static create(): PeriodsService {
    return new this();
  }

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiPeriodsGetByIdArgs): Promise<Result<Api["Periods"]["Client"]["GetPeriodResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiPeriodsSsr.create({ cookie }).getById({ id });
    });
  };

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["Periods"]["Client"]["GetPeriodsFilters"]>): Promise<
    Result<Api["Periods"]["Client"]["GetPeriodsResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiPeriodsSsr.create({ cookie }).list(rest);
    });
  };

  listAll = async ({
    cookie,
    orgId,
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["Periods"]["Client"]["GetPeriodsResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiPeriodsSsr.create({ cookie });

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
    period: Api["Periods"]["Client"]["CreatePeriodBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["Periods"]["Client"]["CreatePeriodResponse"]>> => {
    try {
      const result = await ApiPeriods.create().submit({
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
    periodId: Api["Periods"]["Client"]["Period"]["id"];
    values: Api["Periods"]["Client"]["UpdatePeriodBody"];
  }): Promise<Result<Api["Periods"]["Client"]["UpdatePeriodResponse"]>> => {
    try {
      const result = await ApiPeriods.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  close = async ({
    periodId,
    args: body,
  }: {
    periodId: Api["Periods"]["Client"]["Period"]["id"];
    args: Api["Periods"]["Client"]["ClosePeriodBody"];
  }): Promise<Result<Api["Periods"]["Client"]["ClosePeriodResponse"]>> => {
    try {
      const result = await ApiPeriods.create().close({ periodId, body });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };
}
