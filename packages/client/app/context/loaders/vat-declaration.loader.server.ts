import type { LoaderFunctionArgs } from "react-router";
import { VatPeriodsServer } from "~/context/server/vat+periods.server";
import { isNullish } from "@usenullish/nullish-common";
import { OrganizationsServer } from "~/context/server/organizations.server";
import { findReportPeriod } from "~/context/loaders/_period.loader.server";
import { VAT_PERIOD_ID_KEY } from "~/context/constants/periods.constants";

export const loadVatDeclarationData = async (args: LoaderFunctionArgs) => {
  const periods = (await VatPeriodsServer.create().listAllVatPeriods(args))?.periods ?? [];

  const period = findReportPeriod({
    periods,
    request: args.request,
    key: VAT_PERIOD_ID_KEY,
  });

  if (isNullish(period)) {
    return { periods, period, declaration: undefined };
  }

  const declaration = await OrganizationsServer.create().generateReportsVatDeclaration(args, {
    vatPeriodId: period.id,
  });

  return { periods, period, declaration };
};
