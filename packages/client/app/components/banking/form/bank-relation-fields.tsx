import { useId, useState } from "react";
import { formatIban, isNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { AccountType } from "@usenullish/nullish-schema/db";
import { Field, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { CurrencyCombobox } from "~/components/core/currency-combobox";
import { AccountCombobox } from "~/components/settings/accounts/combobox/account-combobox";
import { useAccounts } from "~/context/contexts/accounts.context";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useI18n } from "~/kit/i18n/i18n.context";

const IBAN_PLACEHOLDER = "CH93 0076 2011 6238 5295 7";

const QR_IBAN_PLACEHOLDER = "CH44 3199 9123 0008 8901 2";

export const BankRelationFields = ({
  bankRelation,
}: {
  bankRelation?: Api["BankRelations"]["Client"]["BankRelation"];
}) => {
  const { i18n } = useI18n();
  const accounts = useAccounts();
  const accountingSettings = useAccountingSettings();
  const nameId = useId();
  const ibanId = useId();
  const invoiceIbanId = useId();
  const currencyId = useId();
  const accountId = useId();

  const [name, setName] = useState(bankRelation?.name ?? "");
  const [iban, setIban] = useState(isNullish(bankRelation) ? "" : formatIban(bankRelation.iban));
  const [invoiceIban, setInvoiceIban] = useState(
    isNullish(bankRelation?.invoiceIban) ? "" : formatIban(bankRelation.invoiceIban),
  );
  const [currency, setCurrency] = useState<Option<string>>(
    bankRelation?.currency ?? accountingSettings?.baseCurrency,
  );

  const notAssetAccountIds = (accounts ?? [])
    .filter(({ type }) => type !== AccountType.ASSET)
    .map(({ id }) => id);

  return (
    <>
      <Field>
        <FieldLabel htmlFor={nameId}>{i18n.core.label.name}</FieldLabel>
        <Input
          id={nameId}
          name="name"
          value={name}
          onChange={($event) => setName($event.target.value)}
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={ibanId}>{i18n.bank_relations.label.iban}</FieldLabel>
        <Input
          id={ibanId}
          name="iban"
          value={iban}
          onChange={($event) => setIban($event.target.value)}
          placeholder={IBAN_PLACEHOLDER}
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={invoiceIbanId}>{i18n.bank_relations.label.qr_iban}</FieldLabel>
        <Input
          id={invoiceIbanId}
          name="invoiceIban"
          value={invoiceIban}
          onChange={($event) => setInvoiceIban($event.target.value)}
          placeholder={QR_IBAN_PLACEHOLDER}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={currencyId}>{i18n.core.label.currency}</FieldLabel>
        <CurrencyCombobox
          id={currencyId}
          name="currency"
          value={currency}
          onValueChange={(code) => setCurrency(code ?? currency)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={accountId}>{i18n.bank_relations.label.account}</FieldLabel>
        <AccountCombobox
          id={accountId}
          name="accountId"
          defaultAccountId={bankRelation?.accountId}
          excludedAccountIds={notAssetAccountIds}
          postableOnly
        />
      </Field>
    </>
  );
};
