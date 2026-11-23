import type { LoaderFunctionArgs } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";
import { PeriodsServer } from "~/context/server/periods.server";
import { VatSettingsServer } from "~/context/server/vat+settings.server";
import { VatMethodsServer } from "~/context/server/vat+methods.server";

export interface OrganizationSetup {
  period: Option<Api["Periods"]["Client"]["Period"]>;
  vatSetting: Option<Api["VatSettings"]["Client"]["VatSetting"]>;
  vatMethod: Option<Api["VatMethods"]["Client"]["VatMethod"]>;
}

export class OrganizationsSetupServer {
  private constructor() {}

  static create(): OrganizationsSetupServer {
    return new this();
  }

  async load(args: LoaderFunctionArgs): Promise<OrganizationSetup> {
    const [periods, vatSettings, vatMethods] = await Promise.all([
      PeriodsServer.create().listPeriods(args),
      VatSettingsServer.create().listVatSettings(args),
      VatMethodsServer.create().listAllVatMethods(args),
    ]);

    const period = periods?.data[0];

    return {
      period,
      vatSetting: vatSettings?.data[0],
      vatMethod: vatMethods?.data.find(({ periodId }) => periodId === period?.id),
    };
  }
}
