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
import { ClientActions } from "~/components/billing/clients/list/client-actions";
import { useOrganization } from "~/context/contexts/organization.context";
import { BillingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

export const ClientsTable = ({
  clients,
}: {
  clients: Api["Clients"]["Client"]["GetClientsResponse"]["clients"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const clientPath = (id: string) =>
    BillingPath.create({ organizationId: organization.id }).to({ path: `/clients/${id}` });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="name" label={i18n.core.label.name} />
          <TableHead>{i18n.core.label.type}</TableHead>
          <SortableHeader field="city" label={i18n.organizations.label.city} />
          <SortableHeader field="email" label={i18n.core.label.email} />
          <TableHead>{i18n.core.label.phone}</TableHead>
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {clients.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-muted-foreground">
              {i18n.clients.text.empty}
            </TableCell>
          </TableRow>
        ) : (
          clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="whitespace-normal">{client.name}</TableCell>
              <TableCell>{i18n.clients.type[client.type]}</TableCell>
              <TableCell>{client.city}</TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell>{client.phone}</TableCell>
              <TableCell className="w-px">
                <ClientActions client={client} clientPath={clientPath(client.id)} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
