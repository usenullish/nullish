import type { Api } from "@usenullish/nullish-schema/server";
import { useActionState } from "react";
import { useRevalidator } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { VatSettingEditForm } from "~/components/settings/vat/settings/edit/vat-setting-edit-form";
import { buildUseVatSettingEditAction } from "~/context/form/vat-setting-edit.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";

export const VatSettingEdit = ({
  setting,
}: {
  setting: Api["VatSettings"]["Client"]["VatSetting"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const { revalidate } = useRevalidator();

  const editAction = buildUseVatSettingEditAction({
    vatSettingId: setting.id,
  });

  const editWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await editAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.vat.toast.settings_update_success });
      }

      return state;
    },
    errorMsg: i18n.vat.toast.settings_update_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(
    editWithToastAction,
    INIT_FORM_STATE,
  );

  return (
    <VatSettingEditForm
      key={setting.version}
      onAction={onAction}
      pending={pending}
      setting={setting}
    />
  );
};
