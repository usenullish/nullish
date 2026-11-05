import type { Api } from "@usenullish/nullish-schema/server";
import { useActionState } from "react";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUsePayInvoiceAction } from "~/context/form/pay-invoice.form";
import { PayInvoiceForm } from "~/components/billing/invoices/form/pay-invoice-form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { BillingPath } from "~/navigation";

export const PayInvoice = ({
  invoiceId,
  currency,
  organizationId,
  bankRelations,
}: {
  invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
  currency: Api["Invoices"]["Client"]["Invoice"]["currency"];
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  bankRelations: Api["BankRelations"]["Client"]["GetBankRelationsResponse"]["bankRelations"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const payAction = buildUsePayInvoiceAction({ invoiceId });

  const payWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await payAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.invoices.toast.pay_success });
      }

      return state;
    },
    errorMsg: i18n.invoices.toast.pay_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    payWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate
        to={BillingPath.create({ organizationId }).to({ path: `/invoices/${invoiceId}` })}
      />
    );
  }

  return (
    <PayInvoiceForm
      currency={currency}
      bankRelations={bankRelations}
      onAction={onAction}
      pending={pending}
    />
  );
};
