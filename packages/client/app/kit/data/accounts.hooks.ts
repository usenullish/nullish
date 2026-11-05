import { useCallback, useMemo } from "react";
import { nonNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useAccounts } from "~/context/contexts/accounts.context";
import { useI18n } from "~/kit/i18n/i18n.context";

type Account = Api["Accounts"]["Client"]["Account"];

const useAccountTranslation = (): ((code: Account["code"]) => Option<string>) => {
  const { i18n } = useI18n();

  const translations = useMemo(() => new Map(Object.entries(i18n.accounts.names)), [i18n]);

  return useCallback((code) => translations.get(code), [translations]);
};

export const useAccountName = (): ((account: Pick<Account, "code" | "name">) => string) => {
  const translation = useAccountTranslation();

  return useCallback(({ code, name }) => name ?? translation(code) ?? "", [translation]);
};

export interface AccountUi {
  account: Account;
  label: string;
}

export const useAccountsUi = (): {
  accounts: AccountUi[];
  matches: (params: { accountUi: AccountUi; query: string }) => boolean;
} => {
  const accounts = useAccounts();
  const accountName = useAccountName();
  const translation = useAccountTranslation();

  const searchable = useMemo(
    () =>
      (accounts ?? []).map((account) => ({
        accountUi: { account, label: `${account.code} · ${accountName(account)}` },
        names: [account.name, translation(account.code)]
          .filter(nonNullish)
          .map((name) => name.toLowerCase()),
      })),
    [accounts, accountName, translation],
  );

  const names = useMemo(
    () => new Map(searchable.map(({ accountUi, names }) => [accountUi.account.id, names])),
    [searchable],
  );

  const matches = ({ accountUi: { account }, query }: { accountUi: AccountUi; query: string }) => {
    const search = query.trim().toLowerCase();

    return (
      search === "" ||
      account.code.startsWith(search) ||
      (names.get(account.id) ?? []).some((name) => name.includes(search))
    );
  };

  return { accounts: searchable.map(({ accountUi }) => accountUi), matches };
};
