import type { LoaderFunctionArgs } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { OrganizationsServer } from "~/context/server/organizations.server";
import { loadReportPeriodsData } from "~/context/loaders/_period.loader.server";

export const loadBalanceSheetData = async (args: LoaderFunctionArgs) => {
  const { periods, period } = await loadReportPeriodsData(args);

  if (isNullish(period)) {
    return { periods, period, balanceSheet: [], incomeStatement: [] };
  }

  const query = { periodId: period.id };

  const server = OrganizationsServer.create();

  const [balanceSheet, incomeStatement] = await Promise.all([
    server.listReportsBalanceSheet({ args, query }),
    server.listReportsIncomeStatement({ args, query }),
  ]);

  return {
    periods,
    period,
    balanceSheet: balanceSheet?.balanceSheet ?? [],
    incomeStatement: incomeStatement?.incomeStatement ?? [],
  };
};
