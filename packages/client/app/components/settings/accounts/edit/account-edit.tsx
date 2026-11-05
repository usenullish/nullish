import type { Api } from "@usenullish/nullish-schema/server";
import { useActionState } from "react";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { Navigate, useRevalidator } from "react-router";
import { AccountEditForm } from "~/components/settings/accounts/edit/account-edit-form";
import { buildUseAccountEditAction } from "~/context/form/account-edit.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

export const AccountEdit = ({
  account,
  organizationId,
}: {
  account: Api["Accounts"]["Client"]["Account"];
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const { revalidate } = useRevalidator();
  const { id: accountId } = account;

  const accountEditAction = buildUseAccountEditAction({
    accountId,
  });

  const editAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await accountEditAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.accounts.toast.update_success });
      }

      return state;
    },
    errorMsg: i18n.accounts.toast.update_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    editAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate to={AccountingPath.create({ organizationId }).toSettings({ path: "/accounts" })} />
    );
  }

  return <AccountEditForm onAction={onAction} pending={pending} account={account} />;
};
