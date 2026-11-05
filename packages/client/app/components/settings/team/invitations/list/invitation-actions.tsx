import { useState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { DeleteInvitation } from "~/components/settings/team/invitations/delete/delete-invitation";
import { useI18n } from "~/kit/i18n/i18n.context";

export const InvitationActions = ({
  invitation,
}: {
  invitation: Api["Invitations"]["Client"]["Invitation"];
}) => {
  const { i18n } = useI18n();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <RecordActions
      record={invitation}
      items={
        <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
          {i18n.core.action.delete}
        </DropdownMenuItem>
      }
    >
      <DeleteInvitation invitation={invitation} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </RecordActions>
  );
};
