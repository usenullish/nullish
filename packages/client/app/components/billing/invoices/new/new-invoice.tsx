import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { NewInvoiceForm } from "~/components/billing/invoices/new/new-invoice-form";
import { buildUseNewInvoiceAction } from "~/context/form/new-invoice.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { BillingPath } from "~/navigation";

type CreatedInvoice = Api["Invoices"]["Client"]["CreateInvoiceResponse"];

export const NewInvoice = ({
  organizationId,
  vatRates,
  vatMethods,
  periods,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  vatRates: Api["VatRates"]["Client"]["VatRate"][];
  vatMethods: Api["VatMethods"]["Client"]["VatMethod"][];
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const createAction = buildUseNewInvoiceAction({ organizationId });

  const createWithToastAction = useActionWithNotifyError<CreatedInvoice>({
    action: async (prevState, formData) => {
      const state = await createAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.invoices.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.invoices.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState<CreatedInvoice>, FormData>(
    createWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    const {
      result: {
        invoice: { id: invoiceId },
      },
    } = state;
    return (
      <Navigate
        to={BillingPath.create({ organizationId }).to({ path: `/invoices/${invoiceId}` })}
      />
    );
  }

  return (
    <NewInvoiceForm
      onAction={onAction}
      pending={pending}
      vatRates={vatRates}
      vatMethods={vatMethods}
      periods={periods}
    />
  );
};
