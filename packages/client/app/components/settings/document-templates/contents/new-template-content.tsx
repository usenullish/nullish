import { useActionState } from "react";
import { Navigate } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseNewTemplateContentAction } from "~/context/form/new-template-content.form";
import { NewTemplateContentForm } from "~/components/settings/document-templates/contents/new-template-content-form";
import type { ApiDocumentTemplatesWritableArgs } from "~/lib/api/_document-templates";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { BillingPath } from "~/navigation";

export const NewTemplateContent = ({
  templateId,
  organizationId,
}: ApiDocumentTemplatesWritableArgs & {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const createAction = buildUseNewTemplateContentAction({ templateId });

  const createWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await createAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.template_contents.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.template_contents.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    createWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate
        to={BillingPath.create({ organizationId }).toSettings({
          path: `/document-templates/${templateId}`,
        })}
      />
    );
  }

  return <NewTemplateContentForm onAction={onAction} pending={pending} />;
};
