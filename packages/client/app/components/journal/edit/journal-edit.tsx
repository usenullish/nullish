import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { useLocation, useNavigate, useRevalidator } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { JournalEditForm } from "~/components/journal/edit/journal-edit-form";
import { buildUseJournalEditAction } from "~/context/form/journal-edit.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

export const JournalEdit = ({
  journalEntry,
  organizationId,
  vatRates,
  vatMethods,
  periods,
}: {
  journalEntry: Api["JournalSummaries"]["Client"]["JournalSummary"];
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  vatRates: Api["VatRates"]["Client"]["VatRate"][];
  vatMethods: Api["VatMethods"]["Client"]["VatMethod"][];
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const location = useLocation();

  const {
    entry: { id },
  } = journalEntry;

  const editAction = buildUseJournalEditAction({ id });

  const editWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await editAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.journal.toast.update_success });

        await (location.key === "default"
          ? navigate(AccountingPath.create({ organizationId }).to({ path: `/journal/${id}` }))
          : navigate(-1));
      }

      return state;
    },
    errorMsg: i18n.journal.toast.update_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(
    editWithToastAction,
    INIT_FORM_STATE,
  );

  return (
    <JournalEditForm
      onAction={onAction}
      pending={pending}
      journalEntry={journalEntry}
      vatRates={vatRates}
      vatMethods={vatMethods}
      periods={periods}
    />
  );
};
