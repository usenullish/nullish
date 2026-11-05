import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseNewInvitationAction } from "~/context/form/new-invitation.form";
import { NewInvitationForm } from "~/components/settings/team/invitations/new/new-invitation-form";
import { InvitationCreated } from "~/components/settings/team/invitations/new/invitation-created";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";

type CreatedInvitation = Api["InvitationsCreate"]["Client"]["CreateInvitationResponse"];

export const NewInvitation = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const newInvitationAction = buildUseNewInvitationAction({ organizationId });

  const createAction = useActionWithNotifyError<CreatedInvitation>({
    action: async (prevState, formData) => {
      const state = await newInvitationAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.invitations.toast.create_success });
      }

      return state;
    },
    errorMsg: i18n.invitations.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState<CreatedInvitation>, FormData>(
    createAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return <InvitationCreated created={state.result} />;
  }

  return <NewInvitationForm onAction={onAction} pending={pending} />;
};
