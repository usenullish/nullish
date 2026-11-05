import { isNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { Amount } from "~/components/core/amount";
import { SortableHeader } from "~/components/core/sortable-header";
import { InvoiceActions } from "~/components/billing/invoices/list/invoice-actions";
import { InvoiceStatusBadge } from "~/components/billing/invoices/list/invoice-status-badge";
import { useClients } from "~/context/contexts/clients.context";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

export const InvoicesTable = ({
  invoices,
}: {
  invoices: Api["InvoiceSummaries"]["Client"]["InvoiceSummary"][];
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const clients = useClients();
  const accountingSettings = useAccountingSettings();

  const clientNames = new Map((clients ?? []).map(({ id, name }) => [id, name]));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="issueOn" label={i18n.invoices.label.issue_date} />
          <SortableHeader field="dueOn" label={i18n.invoices.label.due_date} />
          <TableHead>{i18n.invoices.label.client}</TableHead>
          <SortableHeader field="status" label={i18n.core.label.status} />
          <TableHead>{i18n.core.label.currency}</TableHead>
          <TableHead className="text-right">{i18n.invoices.label.total}</TableHead>
          <TableHead className="text-right">{i18n.invoices.label.remaining}</TableHead>
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {invoices.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-muted-foreground">
              {i18n.invoices.text.empty}
            </TableCell>
          </TableRow>
        ) : (
          invoices.map(({ invoice, amounts }) => (
            <TableRow key={invoice.id}>
              <TableCell>{formatDate(invoice.issueOn)}</TableCell>
              <TableCell>{isNullish(invoice.dueOn) ? "" : formatDate(invoice.dueOn)}</TableCell>
              <TableCell className="whitespace-normal">
                {clientNames.get(invoice.clientId)}
              </TableCell>
              <TableCell>
                <InvoiceStatusBadge status={invoice.status} />
              </TableCell>
              <TableCell>
                {invoice.currency}
                {invoice.currency !== accountingSettings?.baseCurrency && (
                  <span className="text-muted-foreground"> × {invoice.exchangeRate}</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <Amount amount={amounts.totals.total} currencyCode={invoice.currency} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <Amount amount={amounts.balance.remaining} currencyCode={invoice.currency} />
              </TableCell>
              <TableCell className="w-px">
                <InvoiceActions invoice={invoice} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
