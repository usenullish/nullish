import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { InvoicesService } from "~/lib/services/invoices.services";
import { useClients } from "~/context/contexts/clients.context";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteInvoice = ({
  invoice,
  open,
  onOpenChange,
  onDeleted,
}: {
  invoice: Pick<Api["Invoices"]["Client"]["Invoice"], "id" | "clientId" | "issueOn">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => Promise<void>;
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const clients = useClients();

  const client = clients?.find(({ id }) => id === invoice.clientId);

  return (
    <DeleteRecord
      delete={() => InvoicesService.create().delete({ invoiceId: invoice.id })}
      texts={{
        title: replacePlaceholders(i18n.invoices.text.delete_title, {
          "{client}": client?.name ?? "",
          "{date}": formatDate(invoice.issueOn),
        }),
        description: i18n.invoices.text.delete_description,
        success: i18n.invoices.toast.delete_success,
        error: i18n.invoices.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
    />
  );
};
