import type { Api } from "@usenullish/nullish-schema/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { SortableHeader } from "~/components/core/sortable-header";
import { InvitationActions } from "~/components/settings/team/invitations/list/invitation-actions";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

export const InvitationsTable = ({
  invitations,
}: {
  invitations: Api["Invitations"]["Client"]["Invitation"][];
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="email" label={i18n.core.label.email} />
          <SortableHeader field="role" label={i18n.team.label.role} />
          <SortableHeader field="expiresAt" label={i18n.invitations.label.expires_on} />
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {invitations.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell>{invitation.email}</TableCell>
            <TableCell>{i18n.team.role[invitation.role]}</TableCell>
            <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
            <TableCell className="w-px">
              <InvitationActions invitation={invitation} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
