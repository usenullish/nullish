import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { NewBankRelationForm } from "~/components/settings/bank-relations/new/new-bank-relation-form";
import { buildUseNewBankRelationAction } from "~/context/form/new-bank-relation.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { BankingPath } from "~/navigation";

export const NewBankRelation = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const createAction = buildUseNewBankRelationAction({ organizationId });

  const createWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await createAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.bank_relations.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.bank_relations.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    createWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate
        to={BankingPath.create({ organizationId }).toSettings({ path: "/bank-relations" })}
      />
    );
  }

  return <NewBankRelationForm onAction={onAction} pending={pending} />;
};
