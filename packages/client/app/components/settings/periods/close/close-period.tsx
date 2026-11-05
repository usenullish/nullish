import { useActionState, useId, useState } from "react";
import { useRevalidator } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { PeriodCloseMode } from "@usenullish/nullish-schema/db";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseClosePeriodAction } from "~/context/form/close-period.form";
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
import { Checkbox } from "~/ui/components/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "~/ui/components/field";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const ClosePeriod = ({
  period,
  open,
  onOpenChange,
}: {
  period: Api["Periods"]["Client"]["Period"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const formatDate = useFormatDate();
  const statusOnlyId = useId();
  const [statusOnly, setStatusOnly] = useState(false);
  const { revalidate } = useRevalidator();

  const closePeriodAction = buildUseClosePeriodAction({ periodId: period.id });

  const closeAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await closePeriodAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.periods.toast.close_success });
      }

      return state;
    },
    errorMsg: i18n.periods.toast.close_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(closeAction, INIT_FORM_STATE);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={buildFormSubmit({ onAction })} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.periods.text.close_title}</AlertDialogTitle>
            <AlertDialogDescription>
              {replacePlaceholders(i18n.periods.text.close_description, {
                "{start}": formatDate(period.startOn),
                "{end}": formatDate(period.endOn),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Field orientation="horizontal">
            <Checkbox id={statusOnlyId} checked={statusOnly} onCheckedChange={setStatusOnly} />
            <FieldContent>
              <FieldLabel htmlFor={statusOnlyId} className="font-normal">
                {i18n.periods.label.status_only}
              </FieldLabel>
              <FieldDescription>{i18n.periods.text.status_only_hint}</FieldDescription>
            </FieldContent>
          </Field>

          <input
            type="hidden"
            name="mode"
            value={statusOnly ? PeriodCloseMode.STATUS_ONLY : PeriodCloseMode.CLOSING_ENTRIES}
          />

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{i18n.core.action.cancel}</AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={pending}>
              {pending ? i18n.periods.state.closing : i18n.periods.action.close}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
