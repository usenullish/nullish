import type { LoaderFunctionArgs } from "react-router";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import { isNullish, nonNullish } from "@usenullish/nullish-common";
import { OrganizationsServer } from "~/context/server/organizations.server";
import { loadReportPeriodsData } from "~/context/loaders/_period.loader.server";

const ACCOUNT_ID_KEY = ApiSchema.AccountLedger.GetAccountLedgerQuerySchema.keyof().enum.accountId;

export const loadAccountLedgerData = async (args: LoaderFunctionArgs) => {
  const { periods, period } = await loadReportPeriodsData(args);

  if (isNullish(period)) {
    return {
      periods,
      period,
      accountIds: [],
      accountId: undefined,
      postings: [],
      totals: undefined,
    };
  }

  const server = OrganizationsServer.create();

  const { data: requestedAccountId } = ApiSchema.AccountLedger.GetAccountLedgerQuerySchema.shape[
    ACCOUNT_ID_KEY
  ].safeParse(new URL(args.request.url).searchParams.get(ACCOUNT_ID_KEY));

  const listActiveAccountIds = async () =>
    (
      await server.listReportsActiveAccounts({
        args,
        query: { periodId: period.id },
      })
    )?.accountIds ?? [];

  const listPostings = async (accountId: NonNullable<typeof requestedAccountId>) => {
    const ledger = await server.listReportsAccountLedger({
      args,
      query: { periodId: period.id, accountId },
    });

    return { postings: ledger?.postings ?? [], totals: ledger?.totals };
  };

  if (nonNullish(requestedAccountId)) {
    const [accountIds, ledger] = await Promise.all([
      listActiveAccountIds(),
      listPostings(requestedAccountId),
    ]);

    return {
      periods,
      period,
      accountIds,
      accountId: requestedAccountId,
      ...ledger,
    };
  }

  const accountIds = await listActiveAccountIds();
  const [accountId] = accountIds;

  if (isNullish(accountId)) {
    return { periods, period, accountIds, accountId, postings: [], totals: undefined };
  }

  const results = await listPostings(accountId);

  return {
    periods,
    period,
    accountIds,
    accountId,
    ...results,
  };
};
