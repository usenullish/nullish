import { isNullish, nonNullish } from "@usenullish/nullish-common";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import type { Api } from "@usenullish/nullish-schema/server";
import { InvoiceStatus } from "@usenullish/nullish-schema/db";
import { Button } from "~/ui/components/button";
import { InvoiceStatusBadge } from "~/components/billing/invoices/list/invoice-status-badge";
import { InvoiceLifecycleAction } from "~/components/billing/invoices/lifecycle/invoice-lifecycle-action";
import { buildUseOpenInvoiceAction } from "~/context/form/open-invoice.form";
import { buildUseVoidInvoiceAction } from "~/context/form/void-invoice.form";
import { buildUseUncollectibleInvoiceAction } from "~/context/form/uncollectible-invoice.form";
import { useOrganization } from "~/context/contexts/organization.context";
import { useClients } from "~/context/contexts/clients.context";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { BillingPath } from "~/navigation";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const InvoiceDetails = ({ invoice }: { invoice: Api["Invoices"]["Client"]["Invoice"] }) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const organization = useOrganization();
  const clients = useClients();
  const accountingSettings = useAccountingSettings();

  const invoicePath = (path: "" | `/${string}`) =>
    BillingPath.create({ organizationId: organization.id }).to({
      path: `/invoices/${invoice.id}${path}`,
    });

  const client = clients?.find(({ id }) => id === invoice.clientId);

  const rows = [
    { label: i18n.core.label.number, value: invoice.number },
    { label: i18n.invoices.label.issue_date, value: formatDate(invoice.issueOn) },
    {
      label: i18n.invoices.label.due_date,
      value: isNullish(invoice.dueOn) ? null : formatDate(invoice.dueOn),
    },
    {
      label: i18n.core.label.currency,
      value:
        invoice.currency === accountingSettings?.baseCurrency
          ? invoice.currency
          : `${invoice.currency} × ${invoice.exchangeRate}`,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xs font-medium">{client?.name}</h1>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <div className="flex flex-wrap gap-2">
          <WriteGuard>
            {invoice.status === InvoiceStatus.DRAFT && (
              <>
                <Button nativeButton={false} render={<Link to={invoicePath("/new")} />}>
                  <Plus />
                  {i18n.invoices.action.add_line}
                </Button>

                <InvoiceLifecycleAction
                  label={i18n.invoices.action.open}
                  title={i18n.invoices.text.open_title}
                  description={i18n.invoices.text.open_description}
                  action={buildUseOpenInvoiceAction({ invoiceId: invoice.id })}
                  successMsg={i18n.invoices.toast.open_success}
                  errorMsg={i18n.invoices.toast.open_error}
                />
              </>
            )}
          </WriteGuard>

          <WriteGuard>
            {invoice.status === InvoiceStatus.OPEN && (
              <>
                <Button nativeButton={false} render={<Link to={invoicePath("/pay")} />}>
                  {i18n.invoices.action.pay}
                </Button>

                <InvoiceLifecycleAction
                  label={i18n.invoices.action.void}
                  title={i18n.invoices.text.void_title}
                  description={i18n.invoices.text.void_description}
                  action={buildUseVoidInvoiceAction({ invoiceId: invoice.id })}
                  successMsg={i18n.invoices.toast.void_success}
                  errorMsg={i18n.invoices.toast.void_error}
                />

                <InvoiceLifecycleAction
                  label={i18n.invoices.action.write_off}
                  title={i18n.invoices.text.write_off_title}
                  description={i18n.invoices.text.write_off_description}
                  action={buildUseUncollectibleInvoiceAction({ invoiceId: invoice.id })}
                  successMsg={i18n.invoices.toast.write_off_success}
                  errorMsg={i18n.invoices.toast.write_off_error}
                />
              </>
            )}
          </WriteGuard>

          <Button variant="outline" nativeButton={false} render={<Link to={invoicePath("/pdf")} />}>
            {i18n.invoices.label.pdf}
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        {rows
          .filter(({ value }) => nonNullish(value))
          .map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
};
