import type { Api } from "@usenullish/nullish-schema/server";
import { useActionState } from "react";
import { useLocation, useNavigate, useRevalidator } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { BankRelationEditForm } from "~/components/banking/edit/bank-relation-edit-form";
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
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const location = useLocation();

  const editAction = buildUseBankRelationEditAction({
    bankRelationId: bankRelation.id,
  });

  const editWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await editAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.bank_relations.toast.update_success });

        await (location.key === "default"
          ? navigate(BankingPath.create({ organizationId }).to({ path: `/${bankRelation.id}` }))
          : navigate(-1));
      }

      return state;
    },
    errorMsg: i18n.bank_relations.toast.update_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(
    editWithToastAction,
    INIT_FORM_STATE,
  );

  return <BankRelationEditForm onAction={onAction} pending={pending} bankRelation={bankRelation} />;
};
