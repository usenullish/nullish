import { toLocalDateString } from "@usenullish/nullish-common";
import { useId, useState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { CurrencyFields } from "~/components/core/currency-fields";
import { useBillingSettings } from "~/context/contexts/billing-settings.context";
import { useCurrencyDecimals } from "~/kit/data/currencies.hooks";
import { amountStep } from "~/kit/utils/amount.utils";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const PayInvoiceForm = ({
  currency,
  bankRelations,
  onAction,
  pending,
}: {
  currency: Api["Invoices"]["Client"]["Invoice"]["currency"];
  bankRelations: Api["BankRelations"]["Client"]["GetBankRelationsResponse"]["bankRelations"];
  onAction: (payload: FormData) => void;
  pending: boolean;
}) => {
  const { i18n } = useI18n();
  const decimalsOf = useCurrencyDecimals();
  const amountId = useId();
  const validOnId = useId();
  const bankRelationId = useId();
  const billingSettings = useBillingSettings();

  const bankRelationItems = [
    { value: null, label: i18n.billing.label.no_bank_relation },
    ...bankRelations.map(({ id, name }) => ({ value: id, label: name })),
  ];

  const [decimals, setDecimals] = useState(() => decimalsOf(currency));

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.invoices.text.pay_title}</h1>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor={validOnId}>{i18n.core.label.date}</FieldLabel>
            <Input
              id={validOnId}
              name="validOn"
              type="date"
              defaultValue={toLocalDateString(new Date())}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={bankRelationId}>{i18n.invoices.label.bank_relation}</FieldLabel>
            <Select
              items={bankRelationItems}
              name="bankRelationId"
              defaultValue={billingSettings?.bankRelationId ?? null}
            >
              <SelectTrigger id={bankRelationId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bankRelationItems.map(({ value, label }) => (
                  <SelectItem key={value ?? ""} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor={amountId}>{i18n.core.label.amount}</FieldLabel>
            <Input
              id={amountId}
              name="amount"
              type="number"
              step={amountStep(decimals)}
              min="0"
              required
            />
          </Field>

          <div className="md:col-span-2">
            <CurrencyFields defaultCurrency={currency} onDecimalsChange={setDecimals} />
          </div>
        </div>

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.invoices.state.paying : i18n.invoices.action.pay}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
