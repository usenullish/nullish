import { VatRatesServer } from "~/context/server/vat+rates.server";
import { VatMethodsServer } from "~/context/server/vat+methods.server";
import { PeriodsServer } from "~/context/server/periods.server";
import type { LoaderFunctionArgs } from "react-router";

export const loadVatAndPeriod = async (args: LoaderFunctionArgs) => {
  const [rates, methods, periods] = await Promise.all([
    VatRatesServer.create().listAllVatRates(args),
    VatMethodsServer.create().listAllVatMethods(args),
    PeriodsServer.create().listAllPeriods(args),
  ]);

  return { rates, methods, periods };
};
