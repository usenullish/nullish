import { type Tx } from "@usenullish/nullish-db";
import {
  assertNonNullish,
  isNullish,
  nonNullish,
  type Option,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import { type Records } from "@usenullish/nullish-schema/records";
import {
  SystemAccountPurpose,
  VatRemunerationMethod,
  RATE_SCALE_IN_PERCENT,
  InvoiceJournalEntryType,
  InvoiceStatus,
  VatPaymentMethod,
  INVOICE_VAT_TYPES,
} from "@usenullish/nullish-schema/db";
import { type Composites } from "@usenullish/nullish-schema/composites";
import {
  InvoiceService,
  type InvoiceServiceArgs,
  type JournalInsertEntryWithOrgId,
  type JournalInsertWithOrgId,
} from "./_invoice";
import { divideAndRoundToNearest } from "@usenullish/nullish-common";
import { listLines } from "../../_helpers/lines";
import { getVatData, type VatData } from "../../../core/_helpers/vat";
import { parseRate } from "../../../_utils/vat";
import { insertInvoiceJournalEntry } from "../../_helpers/invoice-journal";
import { computeLinesTotal, computeVat } from "../../_helpers/invoice-amounts";
import { EngineError } from "../../../errors";

type Invoice = Records["Billing"]["Invoices"]["Select"];

type Line = Records["Billing"]["Lines"]["Select"];
type Lines = Line[];

type JournalInsertPostings = Composites["Journal"]["Insert"]["postings"];
type JournalInsertPosting = JournalInsertPostings[number];

type SystemAccount = Records["Ledger"]["SystemAccounts"]["Select"];
type SystemAccountsByPurpose = Record<SystemAccountPurpose, Option<SystemAccount>>;

type Vat = VatData & { account: SystemAccount };

type JournalEntrySelect = Records["Ledger"]["JournalEntries"]["Select"];

class InvoiceOpenNegativeTotalError extends EngineError {}
class InvoiceUnexpectedRoundingError extends EngineError {}
class InvoiceUndefinedVatSystemAccountError extends EngineError {}
class InvoiceUnsupportedVatRateError extends EngineError {}

interface InvoiceTotal {
  total: bigint;
  roundingDifference: bigint;
}

export class OpenInvoiceService extends InvoiceService {
  private constructor(args: InvoiceServiceArgs) {
    super(args);
  }

  static create(args: InvoiceServiceArgs): OpenInvoiceService {
    return new this(args);
  }

  open(): Promise<Result<Invoice>> {
    return this._withViewRefresh(async () => {
      return await this.#open();
    });
  }

  #open(): Promise<Result<Invoice>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 1. Load the invoice
        const invoice = await this._loadInvoice({ tx });

        // 2. The invoice must be a draft to be opened
        this._assertInvoiceStatus({ invoice, status: InvoiceStatus.DRAFT });

        // 3. Load the rest of the data
        const lines = await this.#loadLines({ tx, invoiceId: invoice.id });

        // 4. Load the system accounts
        const systemAccounts = await this._loadSystemAccounts({
          tx,
          organizationId: invoice.organizationId,
        });

        // 5. Load VAT methods and rates
        const { vatRateId } = invoice;
        const vatData = nonNullish(vatRateId)
          ? await this.#loadVat({ tx, ...invoice, vatRateId })
          : undefined;

        // 6. Assert + map system accounts and vat
        const { accountsReceivable, incomeAccount, roundingAccount } =
          this.#assertAndMapSystemAccounts({
            systemAccounts,
            organizationId: invoice.organizationId,
          });

        const vat = this.#assertAndMapVat({
          systemAccounts,
          organizationId: invoice.organizationId,
          vat: vatData,
        });

        // 7. Prepare journal
        const invoiceTotal = this.#computeInvoiceTotals({ lines });

        const journal = this.#prepareJournal({
          invoice,
          invoiceTotal,
          incomeAccount,
          accountsReceivable,
          roundingAccount,
          vat,
        });

        // 8. Create journal ("insert into DB")
        const {
          entry: { id: createdJournalId },
        } = await this._createJournal({ journal, tx });

        // 9. Record the invoice has been opened
        await this.#recordOpen({
          tx,
          organizationId: invoice.organizationId,
          journalEntryId: createdJournalId,
          invoiceId: invoice.id,
        });

        // 10. Update invoice status to "Open"
        return this._updateInvoiceStatus({
          tx,
          invoiceId: invoice.id,
          status: InvoiceStatus.OPEN,
        });
      });
    });
  }

  async #loadLines(args: { tx: Tx; invoiceId: Invoice["id"] }): Promise<Lines> {
    return await listLines(args);
  }

  async #loadVat({
    issueOn: validOn,
    ...rest
  }: { tx: Tx; vatRateId: NonNullable<Invoice["vatRateId"]> } & Pick<
    Invoice,
    "organizationId" | "issueOn"
  >): Promise<Option<VatData>> {
    return await getVatData({
      validOn,
      ...rest,
    });
  }

  #computeInvoiceTotals({ lines }: { lines: Lines }): InvoiceTotal {
    const { total, roundingDifference, items, discounts, linesSum } = computeLinesTotal({
      lines,
    });

    if (total < 0n) {
      throw new InvoiceOpenNegativeTotalError(
        `Invoice total is negative (${total}): discounts (${discounts}) exceed items (${items}).`,
      );
    }

    if (roundingDifference < 0n) {
      throw new InvoiceUnexpectedRoundingError(
        `Unexpected negative rounding difference for invoice: the sum of the lines (${linesSum}) exceed its total (${total}).`,
      );
    }

    return {
      total,
      roundingDifference,
    };
  }

  #prepareJournal({
    invoice,
    ...rest
  }: {
    incomeAccount: SystemAccount;
    roundingAccount: SystemAccount;
    accountsReceivable: SystemAccount;
    invoiceTotal: InvoiceTotal;
    invoice: Invoice;
    vat: Option<Vat>;
  }): JournalInsertWithOrgId {
    const { organizationId, issueOn } = invoice;

    const journalEntry: JournalInsertEntryWithOrgId = {
      organizationId,
      validOn: issueOn,
      reference: null,
    };

    return {
      entry: journalEntry,
      postings: this.#prepareJournalPostings({
        invoice,
        ...rest,
      }),
    };
  }

  #prepareJournalPostings({
    invoice: { currency, exchangeRate },
    vat,
    ...rest
  }: {
    incomeAccount: SystemAccount;
    roundingAccount: SystemAccount;
    accountsReceivable: SystemAccount;
    invoiceTotal: InvoiceTotal;
    invoice: Invoice;
    vat: Option<Vat>;
  }): JournalInsertPostings {
    const postingCommon: Pick<JournalInsertPosting, "currency" | "exchangeRate"> = {
      currency,
      exchangeRate,
    };

    if (isNullish(vat)) {
      return this.#prepareJournalPostingsWithoutVat({
        ...rest,
        postingCommon,
      });
    }

    return this.#prepareJournalPostingsWithVat({
      ...rest,
      postingCommon,
      vat,
    });
  }

  #prepareJournalPostingsWithoutVat({
    incomeAccount: { accountId: incomeAccountId },
    roundingAccount: { accountId: roundingAccountId },
    accountsReceivable: { accountId: accountsReceivableId },
    invoiceTotal: { total: invoiceTotal, roundingDifference },
    postingCommon,
  }: {
    incomeAccount: SystemAccount;
    roundingAccount: SystemAccount;
    accountsReceivable: SystemAccount;
    invoiceTotal: InvoiceTotal;
    postingCommon: Pick<JournalInsertPosting, "currency" | "exchangeRate">;
  }): JournalInsertPostings {
    const common: Pick<JournalInsertPosting, "currency" | "exchangeRate" | "vatRateId"> = {
      ...postingCommon,
      vatRateId: null,
    };

    const revenuePosting: JournalInsertPosting = {
      accountId: incomeAccountId,
      description: null,
      debit: 0n,
      credit: invoiceTotal - roundingDifference,
      ...common,
    };

    const roundingDifferencePosting: JournalInsertPosting = {
      accountId: roundingAccountId,
      description: null,
      debit: 0n,
      credit: roundingDifference,
      ...common,
    };

    const accountReceivablePosting: JournalInsertPosting = {
      accountId: accountsReceivableId,
      // TODO: maybe nullable
      description: null,
      debit: invoiceTotal,
      credit: 0n,
      ...common,
    };

    return [
      revenuePosting,
      ...(roundingDifference > 0n ? [roundingDifferencePosting] : []),
      accountReceivablePosting,
    ];
  }

  #prepareJournalPostingsWithVat({
    incomeAccount: { accountId: incomeAccountId },
    roundingAccount: { accountId: roundingAccountId },
    accountsReceivable: { accountId: accountsReceivableId },
    invoiceTotal: { total: invoiceTotal, roundingDifference },
    vat: {
      methods: { paymentMethod },
      rate: { id: vatRateId, rate, netRate },
      account: { accountId: vatAccountId },
    },
    postingCommon,
  }: {
    incomeAccount: SystemAccount;
    roundingAccount: SystemAccount;
    accountsReceivable: SystemAccount;
    invoiceTotal: InvoiceTotal;
    vat: Vat;
    postingCommon: Pick<JournalInsertPosting, "currency" | "exchangeRate">;
  }): JournalInsertPostings {
    const common: Pick<JournalInsertPosting, "currency" | "exchangeRate" | "vatRateId"> = {
      ...postingCommon,
      vatRateId: null,
    };

    // TODO: refactor computeVat and #computeVatDue patterns
    const clientVat = computeVat({ amount: invoiceTotal, rate });

    // Montant taxe comprise facturé au client
    const invoiceTotalPlusVat = invoiceTotal + clientVat;

    const vatDue = this.#computeVatDue({
      paymentMethod,
      netRate,
      clientVat,
      invoiceTotalPlusVat,
    });

    const revenuePosting: JournalInsertPosting = {
      accountId: incomeAccountId,
      description: null,
      debit: 0n,
      credit: invoiceTotalPlusVat - vatDue - roundingDifference,
      ...common,
      // We attach vatRateId ONLY to the revenue posting line because it defines
      // the taxable turnover. Attaching vatRateId to Accounts Receivable, VAT Payable,
      // or Rounding would duplicate tax metadata across non-income lines and break
      // AGREED/RECEIVED aggregation queries (vat-declaration).
      vatRateId,
    };

    const vatPosting: JournalInsertPosting = {
      accountId: vatAccountId,
      description: null,
      debit: 0n,
      credit: vatDue,
      ...common,
    };

    const roundingDifferencePosting: JournalInsertPosting = {
      accountId: roundingAccountId,
      description: null,
      debit: 0n,
      credit: roundingDifference,
      ...common,
    };

    const accountReceivablePosting: JournalInsertPosting = {
      accountId: accountsReceivableId,
      description: null,
      debit: invoiceTotalPlusVat,
      credit: 0n,
      ...common,
    };

    return [
      revenuePosting,
      ...(roundingDifference > 0n ? [roundingDifferencePosting] : []),
      vatPosting,
      accountReceivablePosting,
    ];
  }

  #computeVatDue({
    paymentMethod,
    netRate,
    clientVat,
    invoiceTotalPlusVat,
  }: {
    paymentMethod: VatData["methods"]["paymentMethod"];
    netRate: VatData["rate"]["netRate"];
    clientVat: bigint;
    invoiceTotalPlusVat: bigint;
  }): bigint {
    if (paymentMethod === VatPaymentMethod.EFFECTIVE) {
      return clientVat;
    }

    assertNonNullish(netRate, "The net rate tax of the invoice has no net rate");

    const netVatRate = parseRate(netRate);

    // Compensation TVA due selon méthode de décompte est calculé sur le montant facturé d'après observation
    // e.g.
    // Facture hors TVA 205 CHF
    // TVA 8.1% 16.605 CHF = TVA facturée
    // Total 221.605 CHF = Facture aux clients
    // TVA due 221.605 * 6.2% = 13.73951 CHF
    return divideAndRoundToNearest({
      value: invoiceTotalPlusVat * netVatRate,
      divisor: RATE_SCALE_IN_PERCENT,
    });
  }

  #assertAndMapSystemAccounts({
    systemAccounts: {
      debtor: accountsReceivable,
      default_income: incomeAccount,
      rounding_differences: roundingAccount,
    },
    organizationId,
  }: {
    systemAccounts: SystemAccountsByPurpose;
  } & Pick<Invoice, "organizationId">): {
    accountsReceivable: SystemAccount;
    incomeAccount: SystemAccount;
    roundingAccount: SystemAccount;
  } {
    assertNonNullish(
      accountsReceivable,
      `Organization ${organizationId} has no debtor system account`,
    );

    assertNonNullish(
      incomeAccount,
      `Organization ${organizationId} has no default_income system account`,
    );

    assertNonNullish(
      roundingAccount,
      `Organization ${organizationId} has no rounding_differences system account`,
    );

    return {
      accountsReceivable,
      incomeAccount,
      roundingAccount,
    };
  }

  #assertAndMapVat({
    systemAccounts: {
      vat_remuneration_received: vatRemunerationReceivedAccount,
      vat_tax_due: vatTaxDueAccount,
    },
    organizationId,
    vat,
  }: {
    systemAccounts: SystemAccountsByPurpose;
    vat: Option<VatData>;
  } & Pick<Invoice, "organizationId">): Option<Vat> {
    if (isNullish(vat)) {
      return undefined;
    }

    const expectedType = INVOICE_VAT_TYPES[vat.methods.paymentMethod];

    if (vat.rate.type !== expectedType) {
      throw new InvoiceUnsupportedVatRateError(
        `Only ${expectedType} VAT rates are supported with the ${vat.methods.paymentMethod} payment method, got ${vat.rate.type}`,
      );
    }

    const vatAccount =
      vat.methods.remunerationMethod === VatRemunerationMethod.RECEIVED
        ? vatRemunerationReceivedAccount
        : vatTaxDueAccount;

    if (isNullish(vatAccount)) {
      throw new InvoiceUndefinedVatSystemAccountError(
        `Organization ${organizationId} has no VAT system account`,
      );
    }

    return { account: vatAccount, ...vat };
  }

  async #recordOpen(args: {
    organizationId: Invoice["organizationId"];
    journalEntryId: JournalEntrySelect["id"];
    invoiceId: Invoice["id"];
    tx: Tx;
  }): Promise<void> {
    await insertInvoiceJournalEntry({
      ...args,
      entryType: InvoiceJournalEntryType.OPEN,
    });
  }
}
