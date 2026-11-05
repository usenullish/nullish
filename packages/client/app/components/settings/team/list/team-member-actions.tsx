import { useState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { DeleteOrganizationMember } from "~/components/settings/team/delete/delete-organization-member";
import { useI18n } from "~/kit/i18n/i18n.context";

export const TeamMemberActions = ({
  member,
}: {
  member: Api["OrganizationMembers"]["Client"]["OrganizationMember"];
}) => {
  const { i18n } = useI18n();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <RecordActions
      record={member}
      items={
        <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
          {i18n.core.action.delete}
        </DropdownMenuItem>
      }
    >
      <DeleteOrganizationMember member={member} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </RecordActions>
  );
};
