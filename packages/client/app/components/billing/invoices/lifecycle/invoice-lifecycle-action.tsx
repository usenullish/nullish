import { useActionState, useState } from "react";
import { useRevalidator } from "react-router";
import { type FormState, INIT_FORM_STATE, type UseActionStateFn } from "~/context/form/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/ui/components/alert-dialog";
import { Button } from "~/ui/components/button";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const InvoiceLifecycleAction = ({
  label,
  title,
  description,
  action,
  successMsg,
  errorMsg,
}: {
  label: string;
  title: string;
  description: string;
  action: UseActionStateFn;
  successMsg: string;
  errorMsg: string;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const { revalidate } = useRevalidator();
  const [open, setOpen] = useState(false);

  const actionWithToast = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await action(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        setOpen(false);
        notifySuccess({ msg: successMsg });
      }

      return state;
    },
    errorMsg,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(
    actionWithToast,
    INIT_FORM_STATE,
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" />}>{label}</AlertDialogTrigger>

      <AlertDialogContent>
        <form onSubmit={buildFormSubmit({ onAction })} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{i18n.core.action.cancel}</AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={pending}>
              {label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
