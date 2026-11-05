import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { NewVatRateForm } from "~/components/settings/vat/rates/new/new-vat-rates-form";
import { buildUseNewVatRateAction } from "~/context/form/new-vat-rates.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import type { VatRateDefaults } from "~/components/settings/vat/rates/form/vat-rate-fields";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

export const NewVatRates = ({
  organizationId,
  redirectTo = AccountingPath.create({ organizationId }).to({ path: "/vat/rates" }),
  defaults,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  redirectTo?: string;
  defaults?: VatRateDefaults;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const createAction = buildUseNewVatRateAction({ organizationId });

  const createWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await createAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.vat.toast.rate_create_success });
      }

      return state;
    },
    errorMsg: i18n.vat.toast.rate_create_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    createWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return <Navigate to={redirectTo} />;
  }

  return <NewVatRateForm onAction={onAction} pending={pending} defaults={defaults} />;
};
