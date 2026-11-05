import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Navigate, useRevalidator } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { NewClientForm } from "~/components/billing/clients/new/new-client-form";
import { buildUseNewClientAction } from "~/context/form/new-client.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { BillingPath } from "~/navigation";

type CreatedClient = Api["Clients"]["Client"]["CreateClientResponse"];

export const NewClient = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const { revalidate } = useRevalidator();

  const createAction = buildUseNewClientAction({ organizationId });

  const createWithToastAction = useActionWithNotifyError<CreatedClient>({
    action: async (prevState, formData) => {
      const state = await createAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.clients.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.clients.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState<CreatedClient>, FormData>(
    createWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    const {
      result: {
        client: { id: clientId },
      },
    } = state;
    return (
      <Navigate to={BillingPath.create({ organizationId }).to({ path: `/clients/${clientId}` })} />
    );
  }

  return <NewClientForm onAction={onAction} pending={pending} />;
};
