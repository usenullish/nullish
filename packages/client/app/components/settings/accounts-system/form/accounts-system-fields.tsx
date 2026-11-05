import { useId } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { SystemAccountPurpose } from "@usenullish/nullish-schema/db";
import { Field, FieldLabel } from "~/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { AccountCombobox } from "~/components/settings/accounts/combobox/account-combobox";
import { useI18n } from "~/kit/i18n/i18n.context";

export const AccountsSystemFields = ({
  account,
}: {
  account?: Api["SystemAccounts"]["Client"]["SystemAccount"];
}) => {
  const { i18n } = useI18n();
  const purposeId = useId();
  const accountId = useId();

  const purposes = Object.values(SystemAccountPurpose).map((value) => ({
    value,
    label: i18n.system_accounts.purpose[value],
  }));

  return (
    <>
      <Field>
        <FieldLabel htmlFor={purposeId}>{i18n.core.label.purpose}</FieldLabel>
        <Select items={purposes} name="purpose" defaultValue={account?.purpose} required>
          <SelectTrigger id={purposeId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {purposes.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor={accountId}>{i18n.system_accounts.label.account}</FieldLabel>
        <AccountCombobox id={accountId} name="accountId" defaultAccountId={account?.accountId} />
      </Field>
    </>
  );
};
