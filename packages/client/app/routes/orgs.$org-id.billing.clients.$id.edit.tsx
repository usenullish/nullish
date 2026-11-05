import { ClientEdit } from "~/components/billing/clients/edit/client-edit";
import { useClient } from "~/context/contexts/client.context";
import { useOrganization } from "~/context/contexts/organization.context";
import type { RouteHandle } from "~/kit/router/route-handle";
import { BillingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId, params }) =>
      BillingPath.create({ organizationId }).to({ path: `/clients/${params.id ?? ""}` }),
    label: ({ i18n }) => i18n.clients.text.edit_title,
  },
};

const ClientEditPage = () => {
  const { id: organizationId } = useOrganization();
  const client = useClient();

  return <ClientEdit organizationId={organizationId} client={client} />;
};

// /orgs/:orgId/clients/:id/edit
export default ClientEditPage;
