import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { NewVatMethodsForm } from "~/components/settings/vat/methods/new/new-vat-methods-form";
import { buildUseNewVatMethodsAction } from "~/context/form/new-vat-methods.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

export const NewVatMethods = ({
  organizationId,
  periods,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const createAction = buildUseNewVatMethodsAction({ organizationId });

  const createWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await createAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.vat.toast.methods_create_success });
      }

      return state;
    },
    errorMsg: i18n.vat.toast.methods_create_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    createWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return <Navigate to={AccountingPath.create({ organizationId }).to({ path: "/vat/methods" })} />;
  }

  return <NewVatMethodsForm onAction={onAction} pending={pending} periods={periods} />;
};
