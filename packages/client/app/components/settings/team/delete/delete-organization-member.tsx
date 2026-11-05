import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { OrganizationMembersService } from "~/lib/services/organization-members.services";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteOrganizationMember = ({
  member,
  open,
  onOpenChange,
}: {
  member: Api["OrganizationMembers"]["Client"]["OrganizationMember"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { i18n } = useI18n();

  return (
    <DeleteRecord
      delete={() => OrganizationMembersService.create().delete({ membershipId: member.id })}
      texts={{
        title: replacePlaceholders(i18n.team.text.delete_title, { "{name}": member.name }),
        description: i18n.team.text.delete_description,
        success: i18n.team.toast.delete_success,
        error: i18n.team.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
};
