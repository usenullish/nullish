import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiBillingSettingsSsr } from "~/lib/api/billing+settings.ssr.api";
import { ApiBillingSettings } from "~/lib/api/billing+settings.api";
import type { ApiBillingSettingsWritableArgs } from "~/lib/api/_billing+settings";
import type { Api } from "@usenullish/nullish-schema/server";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import { Service } from "./_services";

export class BillingSettingsService extends Service {
  private constructor() {
    super();
  }

  static create(): BillingSettingsService {
    return new this();
  }

  listAll = async ({
    cookie,
    orgId,
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["BillingSettings"]["Client"]["GetBillingSettingsResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiBillingSettingsSsr.create({ cookie });

      const settings = await this._listAll({
        listFn: async (query) => {
          const { settings } = await api.list({ orgId, query });
          return settings;
        },
      });

      return { settings };
    });
  };

  update = async ({
    values: body,
    ...rest
  }: {
    values: Api["BillingSettings"]["Client"]["UpdateBillingSettingBody"];
  } & ApiBillingSettingsWritableArgs): Promise<
    Result<Api["BillingSettings"]["Client"]["UpdateBillingSettingResponse"]>
  > => {
    try {
      const result = await ApiBillingSettings.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };
}
