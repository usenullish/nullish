import { useState } from "react";
import type { Nullable, Option } from "@usenullish/nullish-common";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/ui/components/combobox";
import { type AccountUi, useAccountsUi } from "~/kit/data/accounts.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

export const AccountCombobox = ({
  id,
  name,
  defaultAccountId,
  postableOnly = false,
  required = true,
  excludedAccountIds = [],
  onAccountChange,
}: {
  id: string;
  name: string;
  defaultAccountId?: AccountUi["account"]["id"];
  postableOnly?: boolean;
  required?: boolean;
  excludedAccountIds?: AccountUi["account"]["id"][];
  onAccountChange?: (accountId: Option<AccountUi["account"]["id"]>) => void;
}) => {
  const { i18n } = useI18n();
  const { accounts, matches } = useAccountsUi();

  const [accountId, setAccountId] = useState(defaultAccountId);

  const parentIds = new Set(accounts.map(({ account }) => account.parentId));

  const items = (
    postableOnly ? accounts.filter(({ account }) => !parentIds.has(account.id)) : accounts
  )
    .filter(({ account }) => !excludedAccountIds.includes(account.id))
    .toSorted((a, b) => a.account.code.localeCompare(b.account.code));

  const selected = accounts.find(({ account }) => account.id === accountId) ?? null;

  return (
    <Combobox
      items={items}
      filter={(accountUi: AccountUi, query: string) => matches({ accountUi, query })}
      name={name}
      value={selected}
      onValueChange={(accountUi: Nullable<AccountUi>) => {
        setAccountId(accountUi?.account.id);
        onAccountChange?.(accountUi?.account.id);
      }}
      itemToStringLabel={({ label }: AccountUi) => label}
      itemToStringValue={({ account }: AccountUi) => account.id}
      isItemEqualToValue={(item: AccountUi, value: AccountUi) =>
        item.account.id === value.account.id
      }
    >
      <ComboboxInput
        id={id}
        placeholder={i18n.system_accounts.label.search_account}
        required={required}
      />

      <ComboboxContent>
        <ComboboxEmpty>{i18n.accounts.text.no_results}</ComboboxEmpty>
        <ComboboxList>
          {(accountUi: AccountUi) => (
            <ComboboxItem key={accountUi.account.id} value={accountUi}>
              {accountUi.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
