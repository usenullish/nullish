import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { InvoiceFields } from "~/components/billing/invoices/form/invoice-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { NetRateTaxMissing } from "~/components/settings/vat/rates/onboarding/net-rate-tax-missing";
import { buildFormSubmit } from "~/kit/utils/form.utils";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

export const NewInvoiceForm = ({
  onAction,
  pending,
  vatRates,
  vatMethods,
  periods,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  vatRates: Api["VatRates"]["Client"]["VatRate"][];
  vatMethods: Api["VatMethods"]["Client"]["VatMethod"][];
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <NetRateTaxMissing vatRates={vatRates} vatMethods={vatMethods} />

      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.invoices.action.create}</h1>

        <InvoiceFields vatRates={vatRates} vatMethods={vatMethods} periods={periods} />

        <Field>
          <Button type="submit" disabled={pending} {...testId(testIds.invoices.create)}>
            {pending ? i18n.invoices.state.creating : i18n.invoices.action.create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
