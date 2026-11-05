import type { LoaderFunctionArgs } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { OrganizationsServer } from "~/context/server/organizations.server";
import { loadReportPeriodsData } from "~/context/loaders/_period.loader.server";

export const loadIncomeStatementData = async (args: LoaderFunctionArgs) => {
  const { periods, period } = await loadReportPeriodsData(args);

  if (isNullish(period)) {
    return { periods, period, incomeStatement: [] };
  }

  const incomeStatement = await OrganizationsServer.create().listReportsIncomeStatement({
    args,
    query: { periodId: period.id },
  });

  return {
    periods,
    period,
    incomeStatement: incomeStatement?.incomeStatement ?? [],
  };
};
