import type { Route } from "./+types/orgs.$org-id.accounting.reports.income-statement";
import { isNullish } from "@usenullish/nullish-common";
import { AccountType } from "@usenullish/nullish-schema/db";
import { Amount } from "~/components/core/amount";
import {
  AccountBalancesSection,
  useReportHierarchy,
} from "~/components/reports/account-balances-section.hook";
import { ReportComputedAt, ReportPeriodSelect } from "~/components/reports/report-period";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { loadIncomeStatementData } from "~/context/loaders/income-statement.loader.server";
import { PERIOD_ID_KEY } from "~/context/constants/periods.constants";

export const loader = async (args: Route.LoaderArgs) => {
  return await loadIncomeStatementData(args);
};

const IncomeStatementPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const accountingSettings = useAccountingSettings();
  const { periods, period, incomeStatement } = loaderData;

  const hierarchy = useReportHierarchy({ rows: incomeStatement });
  const balanceTotal = hierarchy.total;

  if (isNullish(period)) {
    return <p className="text-xs text-muted-foreground">{i18n.periods.text.empty}</p>;
  }

  const income = incomeStatement.filter(({ type }) => type === AccountType.INCOME);
  const expenses = incomeStatement.filter(({ type }) => type === AccountType.EXPENSE);

  const totalIncome = balanceTotal({ rows: income });
  const totalExpenses = balanceTotal({ rows: expenses });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportPeriodSelect periods={periods} period={period} name={PERIOD_ID_KEY} />
        <ReportComputedAt computedAt={incomeStatement.at(0)?.computedAt} />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <AccountBalancesSection
          rows={income}
          hierarchy={hierarchy}
          total={{ label: i18n.reports.label.total, amount: totalIncome }}
        />

        <div className="flex flex-col gap-8">
          <AccountBalancesSection
            rows={expenses}
            hierarchy={hierarchy}
            total={{ label: i18n.reports.label.total, amount: totalExpenses }}
          />

          <div className="flex justify-between gap-4 px-2 text-xs font-medium tabular-nums">
            <span>{i18n.reports.label.result}</span>
            <Amount
              amount={totalIncome - totalExpenses}
              currencyCode={accountingSettings?.baseCurrency}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeStatementPage;
