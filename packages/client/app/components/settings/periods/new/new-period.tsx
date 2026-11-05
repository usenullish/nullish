import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { isNullish, type Option, toLocalDateString } from "@usenullish/nullish-common";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { NewPeriodForm } from "~/components/settings/periods/new/new-period-form";
import { buildUseNewPeriodAction } from "~/context/form/new-period.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { AccountingPath } from "~/navigation";

const nextPeriodDates = ({
  lastPeriod,
}: {
  lastPeriod: Option<Api["Periods"]["Client"]["Period"]>;
}): { startOn: string; endOn: string } => {
  const startOn = isNullish(lastPeriod)
    ? new Date(Date.UTC(new Date().getFullYear(), 0, 1))
    : new Date(
        Date.UTC(
          lastPeriod.endOn.getUTCFullYear(),
          lastPeriod.endOn.getUTCMonth(),
          lastPeriod.endOn.getUTCDate() + 1,
        ),
      );

  const endOn = new Date(
    Date.UTC(startOn.getUTCFullYear() + 1, startOn.getUTCMonth(), startOn.getUTCDate() - 1),
  );

  return { startOn: toLocalDateString(startOn), endOn: toLocalDateString(endOn) };
};

export const NewPeriod = ({
  organizationId,
  lastPeriod,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  lastPeriod: Option<Api["Periods"]["Client"]["Period"]>;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const newPeriodAction = buildUseNewPeriodAction({ organizationId });

  const createAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await newPeriodAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.periods.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.periods.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    createAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate to={AccountingPath.create({ organizationId }).toSettings({ path: "/periods" })} />
    );
  }

  const { startOn, endOn } = nextPeriodDates({ lastPeriod });

  return (
    <NewPeriodForm
      onAction={onAction}
      pending={pending}
      defaultStartOn={startOn}
      defaultEndOn={endOn}
    />
  );
};
