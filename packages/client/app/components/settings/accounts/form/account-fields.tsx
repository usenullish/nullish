import { useId } from "react";
import { isNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { AccountType } from "@usenullish/nullish-schema/db";
import { Field, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { AccountCombobox } from "~/components/settings/accounts/combobox/account-combobox";
import { useAccounts } from "~/context/contexts/accounts.context";
import { useAccountName } from "~/kit/data/accounts.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

type Account = Api["Accounts"]["Client"]["Account"];

// An account cannot be moved under itself or one of its descendants
const useDescendantIds = ({ account }: { account?: Account }): Account["id"][] => {
  const accounts = useAccounts() ?? [];

  const descendantsOf = (id: Account["id"]): Account["id"][] =>
    accounts
      .filter(({ parentId }) => parentId === id)
      .flatMap(({ id: childId }) => [childId, ...descendantsOf(childId)]);

  return isNullish(account) ? [] : [account.id, ...descendantsOf(account.id)];
};

export const AccountFields = ({ account }: { account?: Account }) => {
  const { i18n } = useI18n();
  const accountName = useAccountName();
  const codeId = useId();
  const nameId = useId();
  const typeId = useId();
  const parentId = useId();

  const excludedAccountIds = useDescendantIds({ account });

  const types = Object.values(AccountType).map((value) => ({
    value,
    label: i18n.accounts.type[value],
  }));

  return (
    <>
      <Field>
        <FieldLabel htmlFor={codeId}>{i18n.core.label.code}</FieldLabel>
        <Input id={codeId} name="code" defaultValue={account?.code} required />
      </Field>

      <Field>
        <FieldLabel htmlFor={nameId}>{i18n.core.label.name}</FieldLabel>
        <Input
          id={nameId}
          name="name"
          defaultValue={account?.name ?? undefined}
          placeholder={isNullish(account) ? undefined : accountName({ ...account, name: null })}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={typeId}>{i18n.core.label.type}</FieldLabel>
        <Select items={types} name="type" defaultValue={account?.type} required>
          <SelectTrigger id={typeId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor={parentId}>{i18n.accounts.label.parent}</FieldLabel>
        <AccountCombobox
          id={parentId}
          name="parentId"
          defaultAccountId={account?.parentId ?? undefined}
          required={false}
          excludedAccountIds={excludedAccountIds}
        />
      </Field>
    </>
  );
};
