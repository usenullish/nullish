import type { Route } from "./+types/orgs.$org-id.team.invitations._index";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { InvitationsServer } from "~/context/server/invitations.server";
import { useOrganization } from "~/context/contexts/organization.context";
import { Pagination } from "~/components/core/pagination";
import { InvitationsTable } from "~/components/settings/team/invitations/list/invitations-table";
import { Button } from "~/ui/components/button";
import { OrganizationPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

export const loader = async (args: Route.LoaderArgs) => {
  return await InvitationsServer.create().listInvitations(args);
};

const TeamInvitationsPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const invitations = loaderData?.invitations ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          nativeButton={false}
          render={
            <Link
              to={OrganizationPath.create({
                organizationId: organization.id,
              }).to({ path: "/team/invitations/new" })}
            />
          }
        >
          <Plus />
          {i18n.invitations.action.create}
        </Button>
      </div>

      <InvitationsTable invitations={invitations} />

      <Pagination count={invitations.length} />
    </div>
  );
};

export default TeamInvitationsPage;
