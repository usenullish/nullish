import type { Route } from "./+types/orgs.$org-id.accounting.reports.account-ledger";
import { isNullish, nonNullish } from "@usenullish/nullish-common";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import { AccountLedgerAccounts } from "~/components/reports/account-ledger-accounts";
import { AccountLedgerTable } from "~/components/reports/account-ledger-table";
import { ReportPeriodSelect } from "~/components/reports/report-period";
import { Pagination } from "~/components/core/pagination";
import { FilterDate, FilterText, ListFilters } from "~/components/core/list-filters";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useAccountsUi } from "~/kit/data/accounts.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { loadAccountLedgerData } from "~/context/loaders/account-ledger.loader.server";
import { PERIOD_ID_KEY } from "~/context/constants/periods.constants";

const LEDGER_PARAMS = ApiSchema.AccountLedger.GetAccountLedgerQuerySchema.keyof().options;

export const loader = async (args: Route.LoaderArgs) => {
  return await loadAccountLedgerData(args);
};

const AccountLedgerPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const accountingSettings = useAccountingSettings();
  const { accounts } = useAccountsUi();
  const { periods, period, accountIds, accountId, postings, totals } = loaderData;

  if (isNullish(period)) {
    return <p className="text-xs text-muted-foreground">{i18n.periods.text.empty}</p>;
  }

  const accountsById = new Map(accounts.map((accountUi) => [accountUi.account.id, accountUi]));
  const parentIds = new Set(accounts.map(({ account: { parentId } }) => parentId));

  const activeAccounts = accountIds
    .map((id) => accountsById.get(id))
    .filter(nonNullish)
    .filter(({ account: { id } }) => !parentIds.has(id));

  const current = activeAccounts.find(({ account: { id } }) => id === accountId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ReportPeriodSelect periods={periods} period={period} name={PERIOD_ID_KEY} />

        {nonNullish(current) && (
          <ListFilters keep={LEDGER_PARAMS}>
            <FilterText name="number" label={i18n.core.label.number} numeric />
            <FilterDate name="validOnFrom" label={i18n.journal.label.valid_from} />
            <FilterDate name="validOnTo" label={i18n.journal.label.valid_to} />
            <FilterText name="reference" label={i18n.core.label.reference} />
          </ListFilters>
        )}
      </div>

      {isNullish(current) ? (
        <p className="text-xs text-muted-foreground">{i18n.reports.text.account_ledger_empty}</p>
      ) : (
        <>
          <AccountLedgerAccounts accounts={activeAccounts} accountId={current.account.id} />

          <AccountLedgerTable
            postings={postings}
            totals={totals}
            baseCurrency={accountingSettings?.baseCurrency}
          />

          <Pagination count={postings.length} />
        </>
      )}
    </div>
  );
};

export default AccountLedgerPage;
