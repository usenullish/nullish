import { NewContact } from "~/components/billing/clients/new/new-contact";
import { useClient } from "~/context/contexts/client.context";
import { useOrganization } from "~/context/contexts/organization.context";
import type { RouteHandle } from "~/kit/router/route-handle";
import { BillingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId, params }) =>
      BillingPath.create({ organizationId }).to({ path: `/clients/${params.id ?? ""}` }),
    label: ({ i18n }) => i18n.contacts.action.create,
  },
};

const NewContactPage = () => {
  const { id: organizationId } = useOrganization();
  const { id: clientId } = useClient();

  return <NewContact organizationId={organizationId} clientId={clientId} />;
};

// /orgs/:orgId/clients/$id/new
export default NewContactPage;
