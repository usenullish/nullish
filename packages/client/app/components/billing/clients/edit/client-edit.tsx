import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { useLocation, useNavigate, useRevalidator } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { ClientEditForm } from "~/components/billing/clients/edit/client-edit-form";
import { buildUseClientEditAction } from "~/context/form/client-edit.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { BillingPath } from "~/navigation";

export const ClientEdit = ({
  client,
  organizationId,
}: {
  client: NonNullable<Api["Clients"]["Client"]["GetClientResponse"]["client"]>;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const location = useLocation();

  const editAction = buildUseClientEditAction({ id: client.id });

  const editWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await editAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.clients.toast.update_success });

        await (location.key === "default"
          ? navigate(BillingPath.create({ organizationId }).to({ path: `/clients/${client.id}` }))
          : navigate(-1));
      }

      return state;
    },
    errorMsg: i18n.clients.toast.update_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(
    editWithToastAction,
    INIT_FORM_STATE,
  );

  return <ClientEditForm onAction={onAction} pending={pending} client={client} />;
};
