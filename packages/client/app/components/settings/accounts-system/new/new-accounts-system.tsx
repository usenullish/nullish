import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { NewAccountsSystemForm } from "~/components/settings/accounts-system/new/new-accounts-system-form";
import { buildUseNewAccountsSystemAction } from "~/context/form/new-accounts-system.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

export const NewAccountsSystem = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const newAccountsSystemAction = buildUseNewAccountsSystemAction({
    organizationId,
  });

  const createAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await newAccountsSystemAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.system_accounts.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.system_accounts.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    createAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate
        to={AccountingPath.create({ organizationId }).toSettings({ path: "/system-accounts" })}
      />
    );
  }

  return <NewAccountsSystemForm onAction={onAction} pending={pending} />;
};
