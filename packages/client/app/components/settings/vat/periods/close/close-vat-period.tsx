import { useActionState } from "react";
import { useRevalidator } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseCloseVatPeriodAction } from "~/context/form/close-vat-period.form";
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
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const CloseVatPeriod = ({
  period,
  open,
  onOpenChange,
}: {
  period: Api["VatPeriods"]["Client"]["VatPeriod"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const formatDate = useFormatDate();
  const { revalidate } = useRevalidator();

  const closeVatPeriodAction = buildUseCloseVatPeriodAction({ period });

  const closeAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await closeVatPeriodAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.vat.toast.period_close_success });
      }

      return state;
    },
    errorMsg: i18n.vat.toast.period_close_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(closeAction, INIT_FORM_STATE);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={buildFormSubmit({ onAction })} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.vat.text.period_close_title}</AlertDialogTitle>
            <AlertDialogDescription>
              {replacePlaceholders(i18n.vat.text.period_close_description, {
                "{start}": formatDate(period.startOn),
                "{end}": formatDate(period.endOn),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{i18n.core.action.cancel}</AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={pending}>
              {pending ? i18n.vat.state.closing : i18n.vat.action.period_close}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
