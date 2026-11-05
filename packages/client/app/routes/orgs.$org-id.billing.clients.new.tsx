import { NewClient } from "~/components/billing/clients/new/new-client";
import { useOrganization } from "~/context/contexts/organization.context";
import type { RouteHandle } from "~/kit/router/route-handle";
import { BillingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) => BillingPath.create({ organizationId }).to({ path: "/clients" }),
    label: ({ i18n }) => i18n.clients.action.create,
  },
};

const NewClientsPage = () => {
  const { id: organizationId } = useOrganization();

  return <NewClient organizationId={organizationId} />;
};

// /orgs/:orgId/clients/new
export default NewClientsPage;
