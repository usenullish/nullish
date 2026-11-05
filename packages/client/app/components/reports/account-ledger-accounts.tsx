import { Link, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import type { AccountUi } from "~/kit/data/accounts.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { Button } from "~/ui/components/button";

type AccountLedgerQuery = Api["AccountLedger"]["Client"]["GetAccountLedgerQuery"];
type AccountId = AccountUi["account"]["id"];

const ACCOUNT_ID_KEY: keyof AccountLedgerQuery = "accountId";

const PAGE_SIZE = 12;

export const AccountLedgerAccounts = ({
  accounts,
  accountId,
}: {
  accounts: AccountUi[];
  accountId: AccountId;
}) => {
  const { i18n } = useI18n();
  const [searchParams] = useSearchParams();

  const toAccount = (id: AccountId): string => {
    const params = new URLSearchParams(searchParams);
    params.set(ACCOUNT_ID_KEY, id);
    params.delete("offset");

    return `?${params}`;
  };

  const index = accounts.findIndex(({ account }) => account.id === accountId);
  const pageStart = Math.floor(Math.max(index, 0) / PAGE_SIZE) * PAGE_SIZE;

  const page = accounts.slice(pageStart, pageStart + PAGE_SIZE);
  const previous = accounts[pageStart - PAGE_SIZE];
  const next = accounts[pageStart + PAGE_SIZE];

  return (
    <nav className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={i18n.core.action.previous}
        disabled={isNullish(previous)}
        nativeButton={isNullish(previous)}
        render={
          isNullish(previous) ? undefined : (
            <Link to={toAccount(previous.account.id)} preventScrollReset />
          )
        }
      >
        <ChevronLeft />
      </Button>

      <ul className="grid flex-1 grid-cols-12 gap-1">
        {page.map(({ account, label }) => {
          const current = account.id === accountId;

          return (
            <li key={account.id}>
              <Button
                variant={current ? "secondary" : "ghost"}
                size="sm"
                nativeButton={false}
                className="w-full tabular-nums"
                render={
                  <Link
                    to={toAccount(account.id)}
                    title={label}
                    aria-current={current ? "page" : undefined}
                    preventScrollReset
                  />
                }
              >
                {account.code}
              </Button>
            </li>
          );
        })}
      </ul>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={i18n.core.action.next}
        disabled={isNullish(next)}
        nativeButton={isNullish(next)}
        render={
          isNullish(next) ? undefined : <Link to={toAccount(next.account.id)} preventScrollReset />
        }
      >
        <ChevronRight />
      </Button>
    </nav>
  );
};
