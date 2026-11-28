import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { useLocation, useNavigate, useRevalidator } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { InvoiceEditForm } from "~/components/billing/invoices/edit/invoice-edit-form";
import { buildUseInvoiceEditAction } from "~/context/form/invoice-edit.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { BillingPath } from "~/navigation";

export const InvoiceEdit = ({
  invoice,
  organizationId,
  vatRates,
  vatMethods,
  periods,
}: {
  invoice: Api["InvoiceSummaries"]["Client"]["InvoiceSummary"]["invoice"];
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

  const editAction = buildUseInvoiceEditAction({ invoiceId: invoice.id });

  const editWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await editAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.invoices.toast.update_success });

        await (location.key === "default"
          ? navigate(BillingPath.create({ organizationId }).to({ path: `/invoices/${invoice.id}` }))
          : navigate(-1));
      }

      return state;
    },
    errorMsg: i18n.invoices.toast.update_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(
    editWithToastAction,
    INIT_FORM_STATE,
  );

  return (
    <InvoiceEditForm
      onAction={onAction}
      pending={pending}
      invoice={invoice}
      vatRates={vatRates}
      vatMethods={vatMethods}
      periods={periods}
    />
  );
};
