import type { Tx } from "@usenullish/nullish-db";
import { MigrationContext, type MigrationContextArgs } from "../_context";
import {
  assertArrayAtLeastOne,
  createTokenSchema,
  isArrayAtLeastOne,
  isArrayEmpty,
  isNullish,
  type Nullable,
  nonNullish,
  type Option,
  toLocalDateString,
  tryCatch,
} from "@usenullish/nullish-common";
import {
  EXCHANGE_RATE_ONE,
  InvoiceJournalEntryType,
  InvoiceLineType,
  InvoiceStatus,
} from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Migration } from "@usenullish/nullish-schema/migration";
import { listClientsByOrgId } from "../_helpers/clients";
import { listCurrencies } from "../_helpers/currencies";
import {
  createInvoice,
  createInvoiceJournalEntries,
  listInvoiceJournalEntriesByOrgId,
  updateInvoiceStatus,
} from "../_helpers/invoices";
import {
  type JournalEntryWithVatRates,
  listJournalEntriesWithVatRatesByOrgId,
} from "../_helpers/journal";

type Client = Records["Billing"]["Clients"]["Select"];
type Currency = Records["Core"]["Currencies"]["Select"];
type VatRate = Records["Core"]["VatRates"]["Select"];

type JournalEntry = JournalEntryWithVatRates;

type ForeignInvoices = Migration["Foreign"]["Invoices"];
type ForeignInvoice = Migration["Foreign"]["Invoice"];

interface InvoiceToCreate {
  number: ForeignInvoice["number"];
  clientId: Client["id"];
  issueOn: ForeignInvoice["issueOn"];
  dueOn: ForeignInvoice["dueOn"];
  currency: Currency["code"];
  description: string;
  netAmount: bigint;
  vatRateId: Nullable<VatRate["id"]>;
  saleJournalEntryId: Option<JournalEntry["id"]>;
  paymentJournalEntryIds: [JournalEntry["id"], ...JournalEntry["id"][]];
}

export interface MigrateInvoicesSkipped {
  number: ForeignInvoice["number"];
  reason: string;
}

interface PreparedInvoices {
  toCreate: InvoiceToCreate[];
  toSkip: MigrateInvoicesSkipped[];
}

export interface MigrateInvoicesResult {
  skipped: MigrateInvoicesSkipped[];
  failed: MigrateInvoicesSkipped[];
}

// Only the paid invoices are imported. An invoice that cannot be matched with the journal is skipped,
// and each invoice is created in its own savepoint, so one failing does not stop the others.
export class MigrateInvoicesService extends MigrationContext {
  private constructor(args: MigrationContextArgs) {
    super(args);
  }

  static create(args: MigrationContextArgs): MigrateInvoicesService {
    return new this(args);
  }

  async migrate({
    tx,
    invoices,
  }: {
    tx: Tx;
    invoices: ForeignInvoices;
  }): Promise<MigrateInvoicesResult> {
    const paidInvoices = invoices.filter(({ status }) => status === "paid");

    if (isArrayEmpty(paidInvoices)) {
      return { skipped: [], failed: [] };
    }

    const clients = await listClientsByOrgId({ tx, organizationId: this._organizationId });

    if (clients.status === "error") {
      throw clients.err;
    }

    const journalEntries = await listJournalEntriesWithVatRatesByOrgId({
      tx,
      organizationId: this._organizationId,
    });

    if (journalEntries.status === "error") {
      throw journalEntries.err;
    }

    const linked = await listInvoiceJournalEntriesByOrgId({
      tx,
      organizationId: this._organizationId,
    });

    if (linked.status === "error") {
      throw linked.err;
    }

    const currencies = await listCurrencies({ tx });

    if (currencies.status === "error") {
      throw currencies.err;
    }

    const { toCreate, toSkip } = prepareInvoices({
      invoices: paidInvoices,
      clients: clients.result,
      journalEntries: journalEntries.result,
      linkedJournalEntryIds: new Set(linked.result.map(({ journalEntryId }) => journalEntryId)),
      currenciesByCode: new Map(currencies.result.map((currency) => [currency.code, currency])),
    });

    const byIssueOn = toCreate.toSorted(
      ({ issueOn: a }, { issueOn: b }) => a.getTime() - b.getTime(),
    );

    const failed: MigrateInvoicesSkipped[] = [];

    for (const invoice of byIssueOn) {
      const result = await tryCatch(() =>
        tx.transaction((savepoint) =>
          createPaidInvoice({ tx: savepoint, organizationId: this._organizationId, invoice }),
        ),
      );

      if (result.status === "error") {
        failed.push({
          number: invoice.number,
          reason: result.err instanceof Error ? result.err.message : `${result.err}`,
        });
      }
    }

    return { skipped: toSkip, failed };
  }
}

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

const findJournalEntries = ({
  journalEntries,
  invoiceNumber,
  validOn,
}: {
  journalEntries: JournalEntry[];
  invoiceNumber: ForeignInvoice["number"];
  validOn: Date;
}): JournalEntry[] => {
  // Bexio references the journal entries of an invoice with a keyword - according to the language
  // of the account - followed by its number, e.g. "Facture RE-00180" for invoice number "RE-00180",
  // both when it is issued and when a payment is received.
  const INVOICE_REFERENCE_KEYWORDS = ["Facture", "Rechnung", "Fattura", "Invoice"];

  return journalEntries.filter(
    ({ reference, validOn: entryValidOn }) =>
      toLocalDateString(entryValidOn) === toLocalDateString(validOn) &&
      INVOICE_REFERENCE_KEYWORDS.some((keyword) => reference === `${keyword} ${invoiceNumber}`),
  );
};

const prepareInvoices = ({
  invoices,
  clients,
  journalEntries,
  linkedJournalEntryIds,
  currenciesByCode,
}: {
  invoices: ForeignInvoices;
  clients: Client[];
  journalEntries: JournalEntry[];
  linkedJournalEntryIds: Set<JournalEntry["id"]>;
  currenciesByCode: Map<Currency["code"], Currency>;
}): PreparedInvoices => {
  const clientsByName = new Map<string, Client>(
    clients.map((client) => [client.name.toLowerCase().trim(), client]),
  );

  return invoices.reduce<PreparedInvoices>(
    ({ toCreate, toSkip }, invoice) => {
      const {
        number: invoiceNumber,
        clientName,
        currency: currencyCode,
        issueOn,
        payments,
      } = invoice;

      const skip = (reason: string): PreparedInvoices => ({
        toCreate,
        toSkip: [...toSkip, { number: invoiceNumber, reason }],
      });

      const client = clientsByName.get(clientName.toLowerCase().trim());

      if (isNullish(client)) {
        return skip(`Unknown client "${clientName}"`);
      }

      const currency = currenciesByCode.get(currencyCode);

      if (isNullish(currency)) {
        return skip(`Unknown currency "${currencyCode}"`);
      }

      if (isArrayEmpty(payments)) {
        return skip("No payments information");
      }

      const saleJournalEntries = findJournalEntries({
        journalEntries,
        invoiceNumber,
        validOn: issueOn,
      }).filter(({ creditsIncome }) => creditsIncome);

      if (saleJournalEntries.length > 1) {
        return skip("Multiple journal entries found for the sale");
      }

      const [saleJournalEntry] = saleJournalEntries;

      const paymentJournalEntries = payments.map((payment) => ({
        payment,
        entries: findJournalEntries({
          journalEntries,
          invoiceNumber,
          validOn: payment.paidOn,
        }).filter(({ id }) => id !== saleJournalEntry?.id),
      }));

      const unmatchedPayments = paymentJournalEntries
        .filter(({ entries }) => isArrayEmpty(entries))
        .map(({ payment }) => payment);

      if (isArrayAtLeastOne(unmatchedPayments)) {
        return skip(
          `No journal entry found for the payment(s) of ${unmatchedPayments
            .map(({ paidOn, amount }) => `${formatDate(paidOn)} (${amount} ${currencyCode})`)
            .join(", ")}`,
        );
      }

      const paymentJournalEntryIds = [
        ...new Set(paymentJournalEntries.flatMap(({ entries }) => entries.map(({ id }) => id))),
      ];

      // TS. Every payment has been matched with at least one journal entry above
      if (!isArrayAtLeastOne(paymentJournalEntryIds)) {
        return skip(
          `Unexpected error: no journal entry collected for the ${payments.length} matched payment(s)`,
        );
      }

      const alreadyLinkedEntries = [
        ...saleJournalEntries,
        ...paymentJournalEntries.flatMap(({ entries }) => entries),
      ].filter(({ id }) => linkedJournalEntryIds.has(id));

      if (isArrayAtLeastOne(alreadyLinkedEntries)) {
        return skip(
          `Already migrated, the journal entry(-ies) ${alreadyLinkedEntries
            .map(({ reference, validOn }) => `"${reference}" of ${formatDate(validOn)}`)
            .join(", ")} are already linked to an invoice`,
        );
      }

      const vatRateIds = [
        ...new Set(
          [
            ...saleJournalEntries,
            ...paymentJournalEntries.flatMap(({ entries }) => entries),
          ].flatMap(({ vatRateIds }) => vatRateIds),
        ),
      ];

      if (vatRateIds.length > 1) {
        return skip("Multiple VAT rates booked on the journal entry(-ies) of the invoice");
      }

      const tokenSchema = createTokenSchema({ decimals: currency.decimals });

      return {
        toCreate: [
          ...toCreate,
          {
            number: invoiceNumber,
            clientId: client.id,
            issueOn,
            dueOn: invoice.dueOn,
            currency: currency.code,
            description: invoice.title ?? invoiceNumber,
            netAmount: tokenSchema.parse(`${invoice.netAmount}`),
            vatRateId: vatRateIds[0] ?? null,
            saleJournalEntryId: saleJournalEntry?.id,
            paymentJournalEntryIds,
          },
        ],
        toSkip,
      };
    },
    { toCreate: [], toSkip: [] },
  );
};

// The status trigger only accepts draft -> open -> paid and lines can only be added
// to a draft, so the invoice is walked through the same transitions as in the app.
const createPaidInvoice = async ({
  tx,
  organizationId,
  invoice: {
    clientId,
    issueOn,
    dueOn,
    currency,
    description,
    netAmount,
    vatRateId,
    saleJournalEntryId,
    paymentJournalEntryIds,
  },
}: {
  tx: Tx;
  organizationId: Client["organizationId"];
  invoice: InvoiceToCreate;
}): Promise<void> => {
  const created = await createInvoice({
    tx,
    organizationId,
    invoice: {
      clientId,
      issueOn,
      dueOn: dueOn ?? null,
      currency,
      exchangeRate: EXCHANGE_RATE_ONE,
      vatRateId,
    },
    lines: [
      {
        type: InvoiceLineType.ITEM,
        description,
        quantity: 1,
        unitPrice: netAmount,
      },
    ],
  });

  if (created.status === "error") {
    throw created.err;
  }

  const { id: invoiceId } = created.result;

  const opened = await updateInvoiceStatus({ tx, invoiceId, status: InvoiceStatus.OPEN });

  if (opened.status === "error") {
    throw opened.err;
  }

  const paid = await updateInvoiceStatus({ tx, invoiceId, status: InvoiceStatus.PAID });

  if (paid.status === "error") {
    throw paid.err;
  }

  const entries = [
    ...(nonNullish(saleJournalEntryId)
      ? [{ journalEntryId: saleJournalEntryId, type: InvoiceJournalEntryType.OPEN }]
      : []),
    ...paymentJournalEntryIds.map((journalEntryId) => ({
      journalEntryId,
      type: InvoiceJournalEntryType.PAYMENT,
    })),
  ];

  assertArrayAtLeastOne(entries, "Unexpected error: no journal entry to link.");

  const linked = await createInvoiceJournalEntries({ tx, organizationId, invoiceId, entries });

  if (linked.status === "error") {
    throw linked.err;
  }
};
