import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Navigate, useRevalidator } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { NewAccountForm } from "~/components/settings/accounts/new/new-account-form";
import { buildUseNewAccountAction } from "~/context/form/new-account.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

export const NewAccount = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const { revalidate } = useRevalidator();

  const newAccountAction = buildUseNewAccountAction({
    organizationId,
  });

  const createAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await newAccountAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.accounts.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.accounts.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    createAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate to={AccountingPath.create({ organizationId }).toSettings({ path: "/accounts" })} />
    );
  }

  return <NewAccountForm onAction={onAction} pending={pending} />;
};
