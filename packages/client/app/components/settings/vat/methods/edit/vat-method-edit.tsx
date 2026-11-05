import type { Api } from "@usenullish/nullish-schema/server";
import { useActionState } from "react";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { VatMethodEditForm } from "~/components/settings/vat/methods/edit/vat-method-edit-form";
import { buildUseVatMethodEditAction } from "~/context/form/vat-method-edit.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

export const VatMethodEdit = ({
  method,
  periods,
  organizationId,
}: {
  method: Api["VatMethods"]["Client"]["VatMethod"];
  periods: Api["Periods"]["Client"]["Period"][];
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const editAction = buildUseVatMethodEditAction({
    vatMethodId: method.id,
  });

  const editWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await editAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.vat.toast.methods_update_success });
      }

      return state;
    },
    errorMsg: i18n.vat.toast.methods_update_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    editWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return <Navigate to={AccountingPath.create({ organizationId }).to({ path: "/vat/methods" })} />;
  }

  return (
    <VatMethodEditForm onAction={onAction} pending={pending} method={method} periods={periods} />
  );
};
