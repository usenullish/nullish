import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { InvitationsService } from "~/lib/services/invitations.services";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteInvitation = ({
  invitation,
  open,
  onOpenChange,
}: {
  invitation: Api["Invitations"]["Client"]["Invitation"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { i18n } = useI18n();

  return (
    <DeleteRecord
      delete={() => InvitationsService.create().delete({ invitationId: invitation.id })}
      texts={{
        title: replacePlaceholders(i18n.invitations.text.delete_title, {
          "{email}": invitation.email,
        }),
        description: i18n.invitations.text.delete_description,
        success: i18n.invitations.toast.delete_success,
        error: i18n.invitations.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
};
