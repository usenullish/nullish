import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiAccountingSettingsSsr } from "~/lib/api/accounting+settings.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import { Service } from "./_services";

export class AccountingSettingsService extends Service {
  private constructor() {
    super();
  }

  static create(): AccountingSettingsService {
    return new this();
  }

  listAll = async ({
    cookie,
    orgId,
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["AccountingSettings"]["Client"]["GetAccountingSettingsResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiAccountingSettingsSsr.create({ cookie });

      const settings = await this._listAll({
        listFn: async (query) => {
          const { settings } = await api.list({ orgId, query });
          return settings;
        },
      });

      return { settings };
    });
  };
}
