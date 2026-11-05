import type { Route } from "./+types/orgs.$org-id.billing.clients.$id._index";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useOrganization } from "~/context/contexts/organization.context";
import { ContactsServer } from "~/context/server/clients+contacts.server";
import { useClient } from "~/context/contexts/client.context";
import { Pagination } from "~/components/core/pagination";
import { FilterText, ListFilters } from "~/components/core/list-filters";
import { ClientDetails } from "~/components/billing/clients/details/client-details";
import { ContactActions } from "~/components/billing/clients/contacts/contact-actions";
import { Button } from "~/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { BillingPath } from "~/navigation";
import type { BreadcrumbHandle } from "~/kit/router/route-handle";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const handle: BreadcrumbHandle = {
  breadcrumb: {
    back: ({ organizationId }) => BillingPath.create({ organizationId }).to({ path: "/clients" }),
    label: ({ i18n }) => i18n.clients.text.details,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await ContactsServer.create().listContactsByClientId(args);
};

// /orgs/:org-id/clients/:id
const OrganizationClientPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const client = useClient();
  const organization = useOrganization();

  const contacts = loaderData?.contacts ?? [];

  return (
    <div className="flex flex-col gap-8">
      <ClientDetails client={client} />

      <div className="flex flex-col gap-4">
        <h2 className="text-xs font-medium">{i18n.contacts.text.title}</h2>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <ListFilters>
            <FilterText name="search" label={i18n.core.label.search} />
          </ListFilters>

          <WriteGuard>
            <Button
              nativeButton={false}
              render={
                <Link
                  to={BillingPath.create({ organizationId: organization.id }).to({
                    path: `/clients/${client.id}/new`,
                  })}
                />
              }
            >
              <Plus />
              {i18n.contacts.action.add}
            </Button>
          </WriteGuard>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{i18n.contacts.label.first_name}</TableHead>
              <TableHead>{i18n.contacts.label.last_name}</TableHead>
              <TableHead>{i18n.core.label.email}</TableHead>
              <TableHead>{i18n.core.label.phone}</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  {i18n.contacts.text.empty}
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>{contact.firstName}</TableCell>
                  <TableCell>{contact.lastName}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.phone}</TableCell>
                  <TableCell className="w-px">
                    <ContactActions contact={contact} clientId={client.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Pagination count={contacts.length} />
      </div>
    </div>
  );
};

export default OrganizationClientPage;
