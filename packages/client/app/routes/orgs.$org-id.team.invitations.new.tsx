import { useOrganization } from "~/context/contexts/organization.context";
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

const NewInvitationPage = () => {
  const { id: organizationId } = useOrganization();

  return <NewInvitation organizationId={organizationId} />;
};

// /orgs/:orgId/team/invitations/new
export default NewInvitationPage;
