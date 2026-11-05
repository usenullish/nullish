import type { Api } from "@usenullish/nullish-schema/server";
import { useActionState } from "react";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { BankRelationEditForm } from "~/components/settings/bank-relations/edit/bank-relation-edit-form";
import { buildUseBankRelationEditAction } from "~/context/form/bank-relation-edit.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { BankingPath } from "~/navigation";

export const BankRelationEdit = ({
  bankRelation,
  organizationId,
}: {
  bankRelation: Api["BankRelations"]["Client"]["BankRelation"];
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const editAction = buildUseBankRelationEditAction({
    bankRelationId: bankRelation.id,
  });

  const editWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await editAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.bank_relations.toast.update_success });
      }

      return state;
    },
    errorMsg: i18n.bank_relations.toast.update_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    editWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate
        to={BankingPath.create({ organizationId }).toSettings({ path: "/bank-relations" })}
      />
    );
  }

  return <BankRelationEditForm onAction={onAction} pending={pending} bankRelation={bankRelation} />;
};
