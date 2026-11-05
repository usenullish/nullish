import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseNewLineAction } from "~/context/form/new-line.form";
import { NewLineForm } from "~/components/billing/invoices/new/new-line-form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { BillingPath } from "~/navigation";

export const NewLine = ({
  invoiceId,
  currency,
  organizationId,
}: {
  invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
  currency: Api["Invoices"]["Client"]["Invoice"]["currency"];
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const createAction = buildUseNewLineAction({ invoiceId });

  const createWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await createAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.lines.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.lines.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    createWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate
        to={BillingPath.create({ organizationId }).to({ path: `/invoices/${invoiceId}` })}
      />
    );
  }

  return <NewLineForm currency={currency} onAction={onAction} pending={pending} />;
};
