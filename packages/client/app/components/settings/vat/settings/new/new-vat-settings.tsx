import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { NewVatSettingsForm } from "~/components/settings/vat/settings/new/new-vat-settings-form";
import { buildUseNewVatSettingsAction } from "~/context/form/new-vat-settings.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

export const NewVatSettings = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const createAction = buildUseNewVatSettingsAction({ organizationId });

  const createWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await createAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.vat.toast.settings_create_success });
      }

      return state;
    },
    errorMsg: i18n.vat.toast.settings_create_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    createWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate to={AccountingPath.create({ organizationId }).to({ path: "/vat/settings" })} />
    );
  }

  return <NewVatSettingsForm onAction={onAction} pending={pending} />;
};
