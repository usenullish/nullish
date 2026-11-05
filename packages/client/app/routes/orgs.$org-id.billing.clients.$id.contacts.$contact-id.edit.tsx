import type { Route } from "./+types/orgs.$org-id.billing.clients.$id.contacts.$contact-id.edit";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate } from "react-router";
import { ContactEdit } from "~/components/billing/clients/contacts/contact-edit";
import { ContactsServer } from "~/context/server/clients+contacts.server";
import { useClient } from "~/context/contexts/client.context";
import { useOrganization } from "~/context/contexts/organization.context";
import { BillingPath } from "~/navigation";
import type { RouteHandle } from "~/kit/router/route-handle";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId, params }) =>
      BillingPath.create({ organizationId }).to({ path: `/clients/${params.id ?? ""}` }),
    label: ({ i18n }) => i18n.contacts.text.edit_title,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await ContactsServer.create().getContact(args);
};

const ContactEditPage = ({ loaderData }: Route.ComponentProps) => {
  const organization = useOrganization();
  const client = useClient();

  const clientPath = BillingPath.create({ organizationId: organization.id }).to({
    path: `/clients/${client.id}`,
  });

  const contact = loaderData?.contact;

  if (isNullish(contact)) {
    return <Navigate to={clientPath} replace />;
  }

  return <ContactEdit contact={contact} clientPath={clientPath} />;
};

// /orgs/:orgId/clients/:id/contacts/:contactId/edit
export default ContactEditPage;
