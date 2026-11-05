import type { Api } from "@usenullish/nullish-schema/server";
import { useActionState } from "react";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { DocumentTemplateEditForm } from "~/components/settings/document-templates/edit/document-template-edit-form";
import { buildUseDocumentTemplateEditAction } from "~/context/form/document-template-edit.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { BillingPath } from "~/navigation";

export const DocumentTemplateEdit = ({
  template,
  organizationId,
}: {
  template: Api["DocumentTemplates"]["Client"]["DocumentTemplate"];
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const editAction = buildUseDocumentTemplateEditAction({
    templateId: template.id,
  });

  const editWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await editAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.document_templates.toast.update_success });
      }

      return state;
    },
    errorMsg: i18n.document_templates.toast.update_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    editWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate
        to={BillingPath.create({ organizationId }).toSettings({
          path: `/document-templates/${template.id}`,
        })}
      />
    );
  }

  return <DocumentTemplateEditForm onAction={onAction} pending={pending} template={template} />;
};
