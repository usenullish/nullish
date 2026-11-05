import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseNewApiKeyAction } from "~/context/form/new-api-key.form";
import { NewApiKeyForm } from "~/components/user/api-keys/new/new-api-key-form";
import { ApiKeyCreated } from "~/components/user/api-keys/new/api-key-created";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";

type CreatedApiKey = Api["UserApiKeys"]["Client"]["CreateApiKeyResponse"];

export const NewApiKey = () => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const newApiKeyAction = buildUseNewApiKeyAction();

  const createAction = useActionWithNotifyError<CreatedApiKey>({
    action: async (prevState, formData) => {
      const state = await newApiKeyAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.api_keys.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.api_keys.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState<CreatedApiKey>, FormData>(
    createAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return <ApiKeyCreated created={state.result} />;
  }

  return <NewApiKeyForm onAction={onAction} pending={pending} />;
};
