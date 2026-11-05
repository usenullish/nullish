import type { LoaderFunctionArgs } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { VatType } from "@usenullish/nullish-schema/db";
import type { Option } from "@usenullish/nullish-common";
import { PeriodsServer } from "~/context/server/periods.server";
import { VatSettingsServer } from "~/context/server/vat+settings.server";
import { VatMethodsServer } from "~/context/server/vat+methods.server";
import { VatRatesServer } from "~/context/server/vat+rates.server";

export interface OrganizationSetup {
  period: Option<Api["Periods"]["Client"]["Period"]>;
  vatSetting: Option<Api["VatSettings"]["Client"]["VatSetting"]>;
  vatMethod: Option<Api["VatMethods"]["Client"]["VatMethod"]>;
  netRateTax: Option<Api["VatRates"]["Client"]["VatRate"]>;
}

export class OrganizationsSetupServer {
  private constructor() {}

  static create(): OrganizationsSetupServer {
    return new this();
  }

  async load(args: LoaderFunctionArgs): Promise<OrganizationSetup> {
    const [periods, vatSettings, vatMethods, vatRates] = await Promise.all([
      PeriodsServer.create().listPeriods(args),
      VatSettingsServer.create().listVatSettings(args),
      VatMethodsServer.create().listAllVatMethods(args),
      VatRatesServer.create().listAllVatRates(args),
    ]);

    const period = periods?.periods[0];

    return {
      period,
      vatSetting: vatSettings?.settings[0],
      vatMethod: vatMethods?.methods.find(({ periodId }) => periodId === period?.id),
      netRateTax: vatRates?.rates.find(({ type }) => type === VatType.NET_RATE_TAX),
    };
  }
}
