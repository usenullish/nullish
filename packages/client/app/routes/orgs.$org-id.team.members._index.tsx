import type { Route } from "./+types/orgs.$org-id.team.members._index";
import { OrganizationMembersServer } from "~/context/server/organization-members.server";
import { Pagination } from "~/components/core/pagination";
import { TeamTable } from "~/components/settings/team/list/team-table";

export const loader = async (args: Route.LoaderArgs) => {
  return await OrganizationMembersServer.create().listOrganizationMembers(args);
};

const TeamMembersPage = ({ loaderData }: Route.ComponentProps) => {
  const members = loaderData?.members ?? [];

  return (
    <div className="flex flex-col gap-4">
      <TeamTable members={members} />

      <Pagination count={members.length} />
    </div>
  );
};

export default TeamMembersPage;
