import type { Api } from "@usenullish/nullish-schema/server";
import { useActionState } from "react";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { PeriodEditForm } from "~/components/settings/periods/edit/period-edit-form";
import { buildUsePeriodEditAction } from "~/context/form/period-edit.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

export const PeriodEdit = ({
  period,
  organizationId,
}: {
  period: Api["Periods"]["Client"]["Period"];
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const editAction = buildUsePeriodEditAction({ periodId: period.id });

  const editWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await editAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.periods.toast.update_success });
      }

      return state;
    },
    errorMsg: i18n.periods.toast.update_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    editWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate to={AccountingPath.create({ organizationId }).toSettings({ path: "/periods" })} />
    );
  }

  return <PeriodEditForm onAction={onAction} pending={pending} period={period} />;
};
