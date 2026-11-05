import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseIgnoreMovementAction } from "~/context/form/reconcile-movement.form";
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

export const IgnoreMovement = ({
  bankMovementId,
  open,
  onOpenChange,
  onIgnored,
}: {
  bankMovementId: Api["BankMovements"]["Client"]["BankMovement"]["id"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIgnored: () => void;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const ignoreMovementAction = buildUseIgnoreMovementAction({ bankMovementId });

  const ignoreAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await ignoreMovementAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.bank_movements.toast.ignore_success });
        onOpenChange(false);
        onIgnored();
      }

      return state;
    },
    errorMsg: i18n.bank_movements.toast.ignore_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(ignoreAction, INIT_FORM_STATE);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={buildFormSubmit({ onAction })} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.bank_movements.text.ignore_title}</AlertDialogTitle>
            <AlertDialogDescription>
              {i18n.bank_movements.text.ignore_description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{i18n.core.action.cancel}</AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={pending}>
              {pending ? i18n.bank_movements.state.ignoring : i18n.bank_movements.action.ignore}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
