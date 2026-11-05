import { useActionState } from "react";
import { useRevalidator } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseDeleteApiKeyAction } from "~/context/form/delete-api-key.form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/ui/components/alert-dialog";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const DeleteApiKey = ({
  apiKey,
  open,
  onOpenChange,
}: {
  apiKey: Api["UserApiKeys"]["Client"]["ApiKey"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const { revalidate } = useRevalidator();

  const deleteApiKeyAction = buildUseDeleteApiKeyAction({ apiKeyId: apiKey.id });

  const deleteAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await deleteApiKeyAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.api_keys.toast.delete_success });
      }

      return state;
    },
    errorMsg: i18n.api_keys.toast.delete_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(deleteAction, INIT_FORM_STATE);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={buildFormSubmit({ onAction })} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.api_keys.text.delete_title}</AlertDialogTitle>
            <AlertDialogDescription>{i18n.api_keys.text.delete_description}</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{i18n.core.action.cancel}</AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={pending}>
              {pending ? i18n.api_keys.state.deleting : i18n.api_keys.action.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
