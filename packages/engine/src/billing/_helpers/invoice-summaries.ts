import type { Tx } from "@usenullish/nullish-db";
import { isArrayEmpty, isNullish } from "@usenullish/nullish-common";
import {
  DbSchema,
  InvoiceJournalEntryType,
  InvoiceStatus,
  SystemAccountPurpose,
} from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";
import { and, eq, inArray } from "drizzle-orm";
import { computeLinesTotal, computeVat } from "./invoice-amounts";

type Invoice = Records["Billing"]["Invoices"]["Select"];
type InvoiceSummary = Composites["InvoiceSummaries"]["Select"];
type InvoiceAmounts = Composites["InvoiceSummaries"]["Amounts"];

const CLOSED_STATUSES: readonly InvoiceStatus[] = [InvoiceStatus.VOID, InvoiceStatus.UNCOLLECTIBLE];

const sum = (values: bigint[]): bigint => values.reduce((total, value) => total + value, 0n);

export const loadInvoiceSummaries = async ({
  tx,
  organizationId,
  invoices,
}: {
  tx: Tx;
  organizationId: Invoice["organizationId"];
  invoices: [Invoice, ...Invoice[]];
}): Promise<InvoiceSummary[]> => {
  const invoiceIds = invoices.map(({ id }) => id);
  const clientIds = [...new Set(invoices.map(({ clientId }) => clientId))];
  const vatRateIds = [
    ...new Set(invoices.flatMap(({ vatRateId }) => (isNullish(vatRateId) ? [] : [vatRateId]))),
  ];

  const linesTable = DbSchema.Billing.Invoices.LinesSchema;
  const clientsTable = DbSchema.Billing.Clients.ClientsSchema;
  const ratesTable = DbSchema.Core.Vat.VatRatesSchema;
  const systemAccountsTable = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;
  const invoiceJournalTable = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;
  const postingsTable = DbSchema.Ledger.Journal.PostingsSchema;

  const [lines, clients, rates, [accountsReceivable]] = await Promise.all([
    tx.select().from(linesTable).where(inArray(linesTable.invoiceId, invoiceIds)),
    tx
      .select({ id: clientsTable.id, name: clientsTable.name })
      .from(clientsTable)
      .where(inArray(clientsTable.id, clientIds)),
    isArrayEmpty(vatRateIds)
      ? []
      : tx
          .select({ id: ratesTable.id, rate: ratesTable.rate })
          .from(ratesTable)
          .where(inArray(ratesTable.id, vatRateIds)),
    tx
      .select({ accountId: systemAccountsTable.accountId })
      .from(systemAccountsTable)
      .where(
        and(
          eq(systemAccountsTable.organizationId, organizationId),
          eq(systemAccountsTable.purpose, SystemAccountPurpose.DEBTOR),
        ),
      ),
  ]);

  const payments = isNullish(accountsReceivable)
    ? []
    : await tx
        .select({
          invoiceId: invoiceJournalTable.invoiceId,
          credit: postingsTable.credit,
        })
        .from(invoiceJournalTable)
        .innerJoin(
          postingsTable,
          eq(postingsTable.journalEntryId, invoiceJournalTable.journalEntryId),
        )
        .where(
          and(
            inArray(invoiceJournalTable.invoiceId, invoiceIds),
            eq(invoiceJournalTable.type, InvoiceJournalEntryType.PAYMENT),
            eq(postingsTable.accountId, accountsReceivable.accountId),
          ),
        );

  const ratesById = new Map(rates.map(({ id, rate }) => [id, rate]));
  const clientsById = new Map(clients.map(({ id, name }) => [id, { name }]));

  const summarize = (invoice: Invoice): InvoiceAmounts => {
    const { total: subtotal } = computeLinesTotal({
      lines: lines.filter(({ invoiceId }) => invoiceId === invoice.id),
    });

    const rate = isNullish(invoice.vatRateId) ? undefined : ratesById.get(invoice.vatRateId);

    // The VAT the client is charged at the rate of the invoice, not the net-rate VAT due to the tax
    // authority that opening the invoice books.
    const vat = isNullish(rate) ? 0n : computeVat({ amount: subtotal, rate });

    const total = subtotal + vat;

    const paid = sum(
      payments.filter(({ invoiceId }) => invoiceId === invoice.id).map(({ credit }) => credit),
    );

    return {
      totals: { subtotal, vat, total },
      balance: {
        paid,
        remaining: CLOSED_STATUSES.includes(invoice.status) ? 0n : total - paid,
      },
    };
  };

  return invoices.map((invoice) =>
    CompositesSchema.InvoiceSummariesSchema.SelectInvoiceSummariesSchema.parse({
      invoice,
      client: clientsById.get(invoice.clientId),
      amounts: summarize(invoice),
    }),
  );
};
