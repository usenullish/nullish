import type { Api } from "@usenullish/nullish-schema/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { Avatar, AvatarFallback, AvatarImage } from "~/ui/components/avatar";
import { SortableHeader } from "~/components/core/sortable-header";
import { TeamMemberActions } from "~/components/settings/team/list/team-member-actions";
import { useI18n } from "~/kit/i18n/i18n.context";

export const TeamTable = ({
  members,
}: {
  members: Api["OrganizationMembers"]["Client"]["OrganizationMember"][];
}) => {
  const { i18n } = useI18n();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="name" label={i18n.core.label.name} />
          <SortableHeader field="email" label={i18n.core.label.email} />
          <SortableHeader field="role" label={i18n.team.label.role} />
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="whitespace-normal">
              <div className="flex items-center gap-2">
                <Avatar className="size-6">
                  <AvatarImage src={member.image ?? undefined} alt={member.name} />
                  <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                {member.name}
              </div>
            </TableCell>
            <TableCell>{member.email}</TableCell>
            <TableCell>{i18n.team.role[member.role]}</TableCell>
            <TableCell className="w-px">
              <TeamMemberActions member={member} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
