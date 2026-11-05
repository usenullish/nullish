import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { NewDocumentTemplateForm } from "~/components/settings/document-templates/new/new-document-template-form";
import { buildUseNewDocumentTemplateAction } from "~/context/form/new-document-template.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { BillingPath } from "~/navigation";

type CreatedDocumentTemplate = Api["DocumentTemplates"]["Client"]["CreateDocumentTemplateResponse"];

export const NewDocumentTemplate = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const createAction = buildUseNewDocumentTemplateAction({ organizationId });

  const createWithToastAction = useActionWithNotifyError<CreatedDocumentTemplate>({
    action: async (prevState, formData) => {
      const state = await createAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.document_templates.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.document_templates.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState<CreatedDocumentTemplate>, FormData>(
    createWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    const {
      result: {
        template: { id: templateId },
      },
    } = state;
    return (
      <Navigate
        to={BillingPath.create({ organizationId }).toSettings({
          path: `/document-templates/${templateId}`,
        })}
      />
    );
  }

  return <NewDocumentTemplateForm onAction={onAction} pending={pending} />;
};
