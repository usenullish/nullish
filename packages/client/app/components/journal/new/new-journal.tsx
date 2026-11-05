import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Navigate } from "react-router";
import { NewJournalForm } from "~/components/journal/new/new-journal-form";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseNewJournalAction } from "~/context/form/new-journal.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

type CreatedJournal = Api["Journal"]["Client"]["CreateJournalEntryResponse"];

export const NewJournal = ({
  organizationId,
  template,
  vatRates,
  vatMethods,
  periods,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  template?: Api["JournalSummaries"]["Client"]["JournalSummary"];
  vatRates: Api["VatRates"]["Client"]["VatRate"][];
  vatMethods: Api["VatMethods"]["Client"]["VatMethod"][];
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const createAction = buildUseNewJournalAction({ organizationId });

  const createWithToastAction = useActionWithNotifyError<CreatedJournal>({
    action: async (prevState, formData) => {
      const state = await createAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.journal.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.journal.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState<CreatedJournal>, FormData>(
    createWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return <Navigate to={AccountingPath.create({ organizationId }).to({ path: "/journal" })} />;
  }

  return (
    <NewJournalForm
      onAction={onAction}
      pending={pending}
      template={template}
      vatRates={vatRates}
      vatMethods={vatMethods}
      periods={periods}
    />
  );
};
