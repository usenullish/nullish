import { useActionState } from "react";
import { useRevalidator } from "react-router";
import { nonNullish, type Result } from "@usenullish/nullish-common";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseDeleteRecordAction } from "~/context/form/delete-record.form";
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

export const DeleteRecord = ({
  delete: deleteRecord,
  texts: { title, description, success, error },
  open,
  onOpenChange,
  onDeleted,
}: {
  delete: () => Promise<Result<void>>;
  texts: { title: string; description: string; success: string; error: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => Promise<void>;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const { revalidate } = useRevalidator();

  const deleteRecordAction = buildUseDeleteRecordAction({ delete: deleteRecord });

  const deleteAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await deleteRecordAction(prevState, formData);

      if (state.name === "ready") {
        await (nonNullish(onDeleted) ? onDeleted() : revalidate());
        notifySuccess({ msg: success });
      }

      return state;
    },
    errorMsg: error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(deleteAction, INIT_FORM_STATE);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={buildFormSubmit({ onAction })} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{i18n.core.action.cancel}</AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={pending}>
              {pending ? i18n.core.state.deleting : i18n.core.action.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
