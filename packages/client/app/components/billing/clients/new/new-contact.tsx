import { useActionState } from "react";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseNewContactAction } from "~/context/form/new-contact.form";
import { NewContactForm } from "~/components/billing/clients/new/new-contact-form";
import type { ApiWithClientIdArgs } from "~/lib/api/_clients";
import type { Api } from "@usenullish/nullish-schema/server";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { BillingPath } from "~/navigation";

export const NewContact = ({
  clientId,
  organizationId,
}: ApiWithClientIdArgs & {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const createAction = buildUseNewContactAction({ clientId });

  const createWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await createAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.contacts.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.contacts.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    createWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return (
      <Navigate to={BillingPath.create({ organizationId }).to({ path: `/clients/${clientId}` })} />
    );
  }

  return <NewContactForm onAction={onAction} pending={pending} />;
};
