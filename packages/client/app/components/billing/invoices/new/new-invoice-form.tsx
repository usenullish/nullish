import { useId, useState } from "react";
import {
  isNullish,
  nonNullish,
  type Nullable,
  type Option,
  toLocalDateString,
} from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { VatRateSelect } from "~/components/settings/vat/rates/select/vat-rate-select";
import { ClientCombobox } from "~/components/billing/clients/combobox/client-combobox";
import { CurrencyFields } from "~/components/core/currency-fields";
import { useBillingSettings } from "~/context/contexts/billing-settings.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { isInvoiceVatRateUsableOn } from "~/kit/utils/vat-rates.utils";
import { buildFormSubmit } from "~/kit/utils/form.utils";

type VatRate = Api["VatRates"]["Client"]["VatRate"];

const dueDate = ({ issueOn, days }: { issueOn: string; days: Option<number> }): string => {
  const date = new Date(issueOn);

  if (isNullish(days) || Number.isNaN(date.getTime())) {
    return "";
  }

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

export const NewInvoiceForm = ({
  onAction,
  pending,
  vatRates,
  vatMethods,
  periods,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  vatRates: VatRate[];
  vatMethods: Api["VatMethods"]["Client"]["VatMethod"][];
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();
  const clientId = useId();
  const issueOnId = useId();
  const dueOnId = useId();
  const vatRateId = useId();

  const billingSettings = useBillingSettings();

  const [issueOn, setIssueOn] = useState(() => toLocalDateString(new Date()));
  const [dueOn, setDueOn] = useState(() =>
    dueDate({ issueOn, days: billingSettings?.paymentTermDays }),
  );
  const [dueOnEdited, setDueOnEdited] = useState(false);
  const [vatRate, setVatRate] = useState<Nullable<VatRate["id"]>>(() => {
    const defaultRate = vatRates.find(({ id }) => id === billingSettings?.vatRateId);

    return nonNullish(defaultRate) &&
      isInvoiceVatRateUsableOn({ rate: defaultRate, date: issueOn, vatMethods, periods })
      ? defaultRate.id
      : null;
  });

  const validRates = vatRates.filter((rate) =>
    isInvoiceVatRateUsableOn({ rate, date: issueOn, vatMethods, periods }),
  );

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.invoices.action.create}</h1>

        <Field>
          <FieldLabel htmlFor={clientId}>
            {i18n.invoices.label.client} <span aria-hidden="true">*</span>
          </FieldLabel>
          <ClientCombobox id={clientId} name="clientId" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor={issueOnId}>{i18n.invoices.label.issue_date}</FieldLabel>
            <Input
              id={issueOnId}
              name="issueOn"
              type="date"
              value={issueOn}
              onChange={($event) => {
                setIssueOn($event.target.value);

                if (!dueOnEdited) {
                  setDueOn(
                    dueDate({
                      issueOn: $event.target.value,
                      days: billingSettings?.paymentTermDays,
                    }),
                  );
                }

                const rate = vatRates.find(({ id }) => id === vatRate);

                if (
                  nonNullish(rate) &&
                  !isInvoiceVatRateUsableOn({
                    rate,
                    date: $event.target.value,
                    vatMethods,
                    periods,
                  })
                ) {
                  setVatRate(null);
                }
              }}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={dueOnId}>{i18n.invoices.label.due_date}</FieldLabel>
            <Input
              id={dueOnId}
              name="dueOn"
              type="date"
              value={dueOn}
              onChange={($event) => {
                setDueOn($event.target.value);
                setDueOnEdited(true);
              }}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor={vatRateId}>{i18n.invoices.label.vat_rate}</FieldLabel>
          <VatRateSelect
            id={vatRateId}
            name="vatRateId"
            vatRates={validRates}
            value={vatRate}
            onValueChange={setVatRate}
          />
        </Field>

        <CurrencyFields />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.invoices.state.creating : i18n.invoices.action.create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
