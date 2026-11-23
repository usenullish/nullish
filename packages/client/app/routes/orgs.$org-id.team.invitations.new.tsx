import type { Route } from "./+types/orgs.$org-id.team.invitations.new";
import { nonNullish } from "@usenullish/nullish-common";
import { useOrganization } from "~/context/contexts/organization.context";
import { useSubscription } from "~/context/contexts/subscription.context";
import { OrganizationMembersServer } from "~/context/server/organization-members.server";
import { NewInvitation } from "~/components/settings/team/invitations/new/new-invitation";
import type { RouteHandle } from "~/kit/router/route-handle";
import { OrganizationPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      OrganizationPath.create({ organizationId }).to({ path: "/team/invitations" }),
    label: ({ i18n }) => i18n.invitations.text.create_title,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await OrganizationMembersServer.create().countOrganizationMembers(args);
};

const NewInvitationPage = ({ loaderData: membersCount }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();
  const subscription = useSubscription();

  const maxMembers = subscription?.plan.rules?.maxMembers;
  const membersLimit =
    nonNullish(maxMembers) && (membersCount ?? 0) >= maxMembers ? maxMembers : undefined;

  return <NewInvitation organizationId={organizationId} membersLimit={membersLimit} />;
};

// /orgs/:orgId/team/invitations/new
export default NewInvitationPage;
