import { ViewTransition } from "react";
import { cn } from "cn";
import { nonNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldError, FieldGroup } from "~/ui/components/field";
import { JournalFields } from "~/components/journal/form/journal-fields";
import { useJournalDescribed } from "~/components/journal/form/_journal-described.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useSidebar } from "~/ui/components/sidebar";

export const JournalEditForm = ({
  onAction,
  pending,
  journalEntry,
  vatRates,
  vatMethods,
  periods,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  journalEntry: Api["JournalSummaries"]["Client"]["JournalSummary"];
  vatRates: Api["VatRates"]["Client"]["VatRate"][];
  vatMethods: Api["VatMethods"]["Client"]["VatMethod"][];
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();
  const { state } = useSidebar();
  const { error, onSubmit } = useJournalDescribed({ onAction });

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "mx-auto w-full py-10 transition-[max-width] duration-200 ease-linear",
        state === "collapsed" ? "max-w-6xl" : "max-w-5xl",
      )}
    >
      <input type="hidden" name="version" value={journalEntry.entry.version} />

      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.journal.text.edit_title}</h1>

        <JournalFields
          journalEntry={journalEntry}
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
            {pending ? i18n.core.state.saving : i18n.core.action.save}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
