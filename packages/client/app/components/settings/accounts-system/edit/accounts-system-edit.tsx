import type { Api } from "@usenullish/nullish-schema/server";
import { useActionState } from "react";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { Navigate } from "react-router";
import { AccountsSystemEditForm } from "~/components/settings/accounts-system/edit/accounts-system-edit-form";
import { buildUseSystemAccountEditAction } from "~/context/form/accounts-system-edit.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

export const AccountsSystemEdit = ({
  account,
  organizationId,
}: {
  account: Api["SystemAccounts"]["Client"]["SystemAccount"];
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const { id: systemAccountId } = account;

  const systemAccountEditAction = buildUseSystemAccountEditAction({
    systemAccountId,
  });

  const editAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await systemAccountEditAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.system_accounts.toast.update_success });
      }

      return state;
    },
    errorMsg: i18n.system_accounts.toast.update_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    editAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate
        to={AccountingPath.create({ organizationId }).toSettings({ path: "/system-accounts" })}
      />
    );
  }

  return <AccountsSystemEditForm onAction={onAction} pending={pending} account={account} />;
};
