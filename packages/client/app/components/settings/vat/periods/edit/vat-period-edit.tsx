import type { Api } from "@usenullish/nullish-schema/server";
import { useActionState } from "react";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { VatPeriodEditForm } from "~/components/settings/vat/periods/edit/vat-period-edit-form";
import { buildUseVatPeriodEditAction } from "~/context/form/vat-period-edit.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

export const VatPeriodEdit = ({
  period,
  organizationId,
}: {
  period: Api["VatPeriods"]["Client"]["VatPeriod"];
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const editAction = buildUseVatPeriodEditAction({
    vatPeriodId: period.id,
  });

  const editWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await editAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.vat.toast.period_update_success });
      }

      return state;
    },
    errorMsg: i18n.vat.toast.period_update_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    editWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return <Navigate to={AccountingPath.create({ organizationId }).to({ path: "/vat/periods" })} />;
  }

  return <VatPeriodEditForm onAction={onAction} pending={pending} period={period} />;
};
