import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiVatSettingsSsr } from "~/lib/api/vat+settings.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiVatSettingsGetByIdArgs } from "~/lib/api/_vat+settings";
import { ApiVatSettings } from "~/lib/api/vat+settings.api";
import { Service } from "./_services";

export class VatSettingsService extends Service {
  private constructor() {
    super();
  }

  static create(): VatSettingsService {
    return new this();
  }

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiVatSettingsGetByIdArgs): Promise<
    Result<Api["VatSettings"]["Client"]["GetVatSettingResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiVatSettingsSsr.create({ cookie }).getById({ id });
    });
  };

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs): Promise<Result<Api["VatSettings"]["Client"]["GetVatSettingsResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiVatSettingsSsr.create({ cookie }).list(rest);
    });
  };

  submit = async ({
    setting,
    organizationId,
  }: {
    setting: Api["VatSettings"]["Client"]["CreateVatSettingBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["VatSettings"]["Client"]["CreateVatSettingResponse"]>> => {
    try {
      const result = await ApiVatSettings.create().submit({
        body: setting,
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
    vatSettingId: Api["VatSettings"]["Client"]["VatSetting"]["id"];
    values: Api["VatSettings"]["Client"]["UpdateVatSettingBody"];
  }): Promise<Result<Api["VatSettings"]["Client"]["UpdateVatSettingResponse"]>> => {
    try {
      const result = await ApiVatSettings.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };
}
