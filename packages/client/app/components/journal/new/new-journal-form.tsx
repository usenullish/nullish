import { ViewTransition } from "react";
import { nonNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldError, FieldGroup } from "~/ui/components/field";
import { JournalFields } from "~/components/journal/form/journal-fields";
import { useJournalDescribed } from "~/components/journal/form/_journal-described.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { NetRateTaxMissing } from "~/components/settings/vat/rates/onboarding/net-rate-tax-missing";

export const NewJournalForm = ({
  onAction,
  pending,
  template,
  vatRates,
  vatMethods,
  periods,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  template?: Api["JournalSummaries"]["Client"]["JournalSummary"];
  vatRates: Api["VatRates"]["Client"]["VatRate"][];
  vatMethods: Api["VatMethods"]["Client"]["VatMethod"][];
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();
  const { error, onSubmit } = useJournalDescribed({ onAction });

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-5xl py-10">
      <NetRateTaxMissing vatRates={vatRates} vatMethods={vatMethods} />

      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.journal.text.new}</h1>

        <JournalFields
          template={template}
          vatRates={vatRates}
          vatMethods={vatMethods}
          periods={periods}
        />

        {nonNullish(error) && (
          <ViewTransition>
            <FieldError>{error}</FieldError>
          </ViewTransition>
        )}

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.journal.state.creating : i18n.journal.action.create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
