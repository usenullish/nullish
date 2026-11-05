import type { Route } from "./+types/orgs.$org-id.accounting.reports.balance-sheet";
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
import { loadBalanceSheetData } from "~/context/loaders/balance-sheet.loader.server";
import { PERIOD_ID_KEY } from "~/context/constants/periods.constants";

export const loader = async (args: Route.LoaderArgs) => {
  return loadBalanceSheetData(args);
};

const BalanceSheetPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const accountingSettings = useAccountingSettings();
  const { periods, period, balanceSheet, incomeStatement } = loaderData;

  const hierarchy = useReportHierarchy({ rows: [...balanceSheet, ...incomeStatement] });
  const balanceTotal = hierarchy.total;

  if (isNullish(period)) {
    return <p className="text-xs text-muted-foreground">{i18n.periods.text.empty}</p>;
  }

  const ofType = (type: AccountType) => balanceSheet.filter((row) => row.type === type);

  const assets = ofType(AccountType.ASSET);
  const liabilities = ofType(AccountType.LIABILITY);
  const equity = ofType(AccountType.EQUITY);

  const result =
    balanceTotal({ rows: incomeStatement.filter(({ type }) => type === AccountType.INCOME) }) -
    balanceTotal({ rows: incomeStatement.filter(({ type }) => type === AccountType.EXPENSE) });

  const totalAssets = balanceTotal({ rows: assets });
  const totalLiabilities = balanceTotal({ rows: liabilities });
  const totalEquityAccounts = balanceTotal({ rows: equity });

  const resultBooked = totalAssets === totalLiabilities + totalEquityAccounts;

  const totalEquity = resultBooked ? totalEquityAccounts : totalEquityAccounts + result;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportPeriodSelect periods={periods} period={period} name={PERIOD_ID_KEY} />
        <ReportComputedAt computedAt={balanceSheet.at(0)?.computedAt} />
      </div>

      {totalAssets !== totalLiabilitiesAndEquity && (
        <p className="text-xs text-destructive">{i18n.reports.text.not_balanced}</p>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <AccountBalancesSection
          rows={assets}
          hierarchy={hierarchy}
          total={{ label: i18n.reports.label.total, amount: totalAssets }}
        />

        <div className="flex flex-col gap-8">
          <AccountBalancesSection
            rows={liabilities}
            hierarchy={hierarchy}
            total={{
              label: i18n.reports.label.total,
              amount: totalLiabilities,
            }}
          />

          <AccountBalancesSection
            rows={equity}
            hierarchy={hierarchy}
            extra={
              resultBooked ? [] : [{ label: i18n.reports.label.period_result, amount: result }]
            }
            total={{ label: i18n.reports.label.total, amount: totalEquity }}
          />

          <div className="flex justify-between gap-4 px-2 text-xs font-medium tabular-nums">
            <span>{i18n.reports.label.total_liabilities_equity}</span>
            <Amount
              amount={totalLiabilitiesAndEquity}
              currencyCode={accountingSettings?.baseCurrency}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetPage;
