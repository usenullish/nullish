import type { Route } from "./+types/orgs.$org-id.billing.invoices.$id._index";
import { LinesServer } from "~/context/server/invoice+lines.server";
import { useInvoice, useInvoiceAmounts } from "~/context/contexts/invoice.context";
import { Amount } from "~/components/core/amount";
import { Pagination } from "~/components/core/pagination";
import { SortableHeader } from "~/components/core/sortable-header";
import { FilterSelect, ListFilters } from "~/components/core/list-filters";
import { LineActions } from "~/components/billing/invoices/details/line-actions";
import { InvoiceDetails } from "~/components/billing/invoices/details/invoice-details";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { divideAndRoundUp } from "@usenullish/nullish-common";
import { InvoiceLineType, QUANTITY_DECIMALS } from "@usenullish/nullish-schema/db";
import type { BreadcrumbHandle } from "~/kit/router/route-handle";
import { useI18n } from "~/kit/i18n/i18n.context";
import { BillingPath } from "~/navigation";

export const handle: BreadcrumbHandle = {
  breadcrumb: {
    back: ({ organizationId }) => BillingPath.create({ organizationId }).to({ path: "/invoices" }),
    label: ({ i18n }) => i18n.invoices.text.details,
  },
};

const QUANTITY_SCALE = 10 ** QUANTITY_DECIMALS;

const lineTotal = ({
  type,
  quantity,
  unitPrice,
}: {
  type: InvoiceLineType;
  quantity: number;
  unitPrice: bigint;
}): bigint => {
  const value = BigInt(Math.round(quantity * QUANTITY_SCALE)) * unitPrice;

  return type === InvoiceLineType.DISCOUNT
    ? -divideAndRoundUp({ value, divisor: BigInt(QUANTITY_SCALE) })
    : value / BigInt(QUANTITY_SCALE);
};

export const loader = async (args: Route.LoaderArgs) => {
  return await LinesServer.create().listLinesByInvoiceId(args);
};

// /orgs/:org-id/invoices/:id
const OrganizationInvoicePage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const invoice = useInvoice();
  const amounts = useInvoiceAmounts();

  const lines = loaderData?.lines ?? [];

  return (
    <div className="flex flex-col gap-8">
      <InvoiceDetails invoice={invoice} />

      <div className="flex flex-col gap-4">
        <h2 className="text-xs font-medium">{i18n.lines.text.title}</h2>

        <ListFilters>
          <FilterSelect
            name="type"
            label={i18n.core.label.type}
            options={Object.values(InvoiceLineType).map((value) => ({
              value,
              label: i18n.lines.type[value],
            }))}
          />
        </ListFilters>

        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="type" label={i18n.core.label.type} />
              <TableHead>{i18n.core.label.description}</TableHead>
              <SortableHeader field="quantity" label={i18n.lines.label.quantity} />
              <SortableHeader field="unitPrice" label={i18n.lines.label.unit_price} />
              <TableHead className="text-right">{i18n.lines.label.total}</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  {i18n.lines.text.empty}
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{i18n.lines.type[line.type]}</TableCell>
                  <TableCell className="whitespace-normal">{line.description}</TableCell>
                  <TableCell className="tabular-nums">{line.quantity}</TableCell>
                  <TableCell className="tabular-nums">
                    <Amount amount={line.unitPrice} currencyCode={invoice.currency} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Amount amount={lineTotal(line)} currencyCode={invoice.currency} />
                  </TableCell>
                  <TableCell className="w-px">
                    <LineActions line={line} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Pagination count={lines.length} />

        <dl className="ml-auto grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs tabular-nums">
          {[
            { label: i18n.invoices.label.subtotal, amount: amounts.totals.subtotal },
            { label: i18n.invoices.label.vat, amount: amounts.totals.vat },
            { label: i18n.invoices.label.total, amount: amounts.totals.total },
            { label: i18n.invoices.label.paid, amount: amounts.balance.paid },
            { label: i18n.invoices.label.remaining, amount: amounts.balance.remaining },
          ].map(({ label, amount }) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right">
                <Amount amount={amount} currencyCode={invoice.currency} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default OrganizationInvoicePage;
