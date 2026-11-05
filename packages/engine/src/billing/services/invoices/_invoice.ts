import { type DbUserContextArgs, type Tx } from "@usenullish/nullish-db";
import { type Records } from "@usenullish/nullish-schema/records";
import {
  InvoiceJournalEntryType,
  SystemAccountPurpose,
  VatRemunerationMethod,
} from "@usenullish/nullish-schema/db";
import {
  assertNonNullish,
  isNullish,
  nonNullish,
  type Nullish,
  type Option,
} from "@usenullish/nullish-common";
import { getJournalEntry, insertJournal, listPostings } from "../../../ledger/_helpers/journal";
import { type Composites } from "@usenullish/nullish-schema/composites";
import { getInvoice, updateInvoice } from "../../_helpers/invoices";
import { getSystemAccounts } from "../../../ledger/_helpers/accounts-system";
import { getVatMethods } from "../../../core/_helpers/vat";
import {
  getInvoiceJournalEntryForInvoice,
  listInvoiceJournalEntries,
} from "../../_helpers/invoice-journal";
import { EngineError } from "../../../errors";
import { ServiceContext } from "../../../_service/service";

type Invoice = Records["Billing"]["Invoices"]["Select"];
type InvoiceId = Records["Billing"]["Invoices"]["Select"]["id"];

type PostingSelect = Records["Ledger"]["Postings"]["Select"];
type PostingsSelect = PostingSelect[];

type JournalEntrySelect = Records["Ledger"]["JournalEntries"]["Select"];

type SelectJournal = Composites["Journal"]["Select"];
type JournalInsert = Composites["Journal"]["Insert"];

export type JournalInsertEntryWithOrgId = JournalInsert["entry"] & {
  organizationId: Invoice["organizationId"];
};
export type JournalInsertWithOrgId = {
  entry: JournalInsertEntryWithOrgId;
  postings: JournalInsert["postings"];
};

type PaymentSelect = Records["Billing"]["InvoiceJournal"]["Select"];
type PaymentsSelect = PaymentSelect[];

type SystemAccount = Records["Ledger"]["SystemAccounts"]["Select"];
type SystemAccountsByPurpose = Record<SystemAccountPurpose, Option<SystemAccount>>;

type VatMethods = Records["Core"]["VatMethods"]["Select"];

export type InvoiceServiceArgs = DbUserContextArgs & { invoiceId: InvoiceId };

export interface VatSystemAccounts {
  remunerationReceived: SystemAccount;
  taxDue: SystemAccount;
}

export interface InvoiceSystemAccounts {
  receivable: SystemAccount;
}

export interface InvoiceDataVat {
  due: bigint;
  alreadyReceivedAmount: bigint;
  accounts: VatSystemAccounts;
}

export interface InvoiceData {
  invoiceTotal: bigint;
  alreadyReceivedPaymentsTotal: bigint;
  vat: Nullish<InvoiceDataVat>;
}

class InvoiceInvalidStatusError extends EngineError {}
class InvoiceUndefinedVatMethodsError extends EngineError {}
class InvoiceUndefinedVatRemunerationSystemAccountError extends EngineError {}
class InvoiceUndefinedVatTaxDueSystemAccountError extends EngineError {}

export abstract class InvoiceService extends ServiceContext {
  readonly #invoiceId: InvoiceId;

  protected constructor({ invoiceId, ...rest }: InvoiceServiceArgs) {
    super(rest);

    this.#invoiceId = invoiceId;
  }

  /**
   * Get the invoice and lock it for the transaction to avoid any changes in the meantime as
   * we aim to update its status if we are able to create all the journal and postings.
   */
  protected async _loadInvoice({ tx }: { tx: Tx }): Promise<Invoice> {
    return await getInvoice({
      tx,
      id: this.#invoiceId,
      lock: "no key update",
    });
  }

  protected _assertInvoiceStatus({
    invoice,
    status,
  }: {
    invoice: Invoice;
    status: Invoice["status"];
  }) {
    if (invoice.status !== status) {
      throw new InvoiceInvalidStatusError(
        `Unexpected status: Invoice ${invoice.id} is ${invoice.status} and not ${status}`,
      );
    }
  }

  protected async _loadSystemAccounts(
    args: { tx: Tx } & Pick<Invoice, "organizationId">,
  ): Promise<SystemAccountsByPurpose> {
    return await getSystemAccounts(args);
  }

  protected async _loadVatMethods({
    tx,
    invoice: { organizationId, issueOn },
  }: {
    tx: Tx;
    invoice: Invoice;
  }): Promise<Option<VatMethods>> {
    return await getVatMethods({ tx, organizationId, validOn: issueOn });
  }

  protected async _createJournal({
    journal,
    tx,
  }: {
    journal: JournalInsertWithOrgId;
    tx: Tx;
  }): Promise<SelectJournal> {
    return await insertJournal({
      tx,
      values: journal,
    });
  }

  protected async _updateInvoiceStatus({
    status,
    ...rest
  }: {
    tx: Tx;
    invoiceId: InvoiceId;
    status: Invoice["status"];
  }): Promise<Invoice> {
    return await updateInvoice({
      ...rest,
      values: { status },
    });
  }

  protected async _loadPostings({
    tx,
    invoiceId,
  }: {
    tx: Tx;
    invoiceId: Invoice["id"];
  }): Promise<{ invoice: PostingsSelect; payments: PostingsSelect }> {
    // Load the journal entries linked with the invoice
    // and all the journal related to payments linked with the invoice
    // (client might pay multiple times)
    const [invoiceJournal, payments] = await Promise.all([
      this._loadInvoiceOpeningJournal({
        tx,
        invoiceId,
      }),
      this.#loadPreviousPayments({
        tx,
        invoiceId,
      }),
    ]);

    // Load all the postings of the journals
    const [invoicePostings, ...paymentsPostings] = await Promise.all([
      this._loadJournalPostings({ tx, journalId: invoiceJournal.id }),
      ...payments.map(({ journalEntryId: journalId }) =>
        this._loadJournalPostings({ tx, journalId }),
      ),
    ]);

    return {
      invoice: invoicePostings,
      payments: paymentsPostings.flat(),
    };
  }

  protected async _loadInvoiceOpeningJournal(args: {
    tx: Tx;
    invoiceId: Invoice["id"];
  }): Promise<JournalEntrySelect> {
    const { journalEntryId } = await getInvoiceJournalEntryForInvoice({
      ...args,
      entryType: InvoiceJournalEntryType.OPEN,
    });

    return await getJournalEntry({ ...args, journalId: journalEntryId });
  }

  async #loadPreviousPayments(args: { tx: Tx; invoiceId: Invoice["id"] }): Promise<PaymentsSelect> {
    return await listInvoiceJournalEntries({
      ...args,
      entryType: InvoiceJournalEntryType.PAYMENT,
    });
  }

  protected async _loadJournalPostings(args: {
    tx: Tx;
    journalId: JournalEntrySelect["id"];
  }): Promise<PostingsSelect> {
    return await listPostings(args);
  }

  protected _assertAndMapVatSystemAccounts({
    systemAccounts: {
      vat_remuneration_received: vatRemunerationReceivedAccount,
      vat_tax_due: vatTaxDueAccount,
    },
    organizationId,
    vatMethods,
    invoice: { vatRateId: invoiceVatRateId, id: invoiceId },
  }: {
    systemAccounts: SystemAccountsByPurpose;
    vatMethods: Nullish<VatMethods>;
    invoice: Invoice;
  } & Pick<Invoice, "organizationId">): Nullish<VatSystemAccounts> {
    if (isNullish(vatMethods)) {
      if (nonNullish(invoiceVatRateId)) {
        throw new InvoiceUndefinedVatMethodsError(
          `Invoice ${invoiceId} has a vatRateId but organization ${organizationId} has no VAT methods for its issue date`,
        );
      }

      return undefined;
    }

    // On agreed basis (prestations convenues), VAT was already claimed/booked upon invoice issuance,
    // so no unrealized VAT account needs to be processed.
    if (vatMethods.remunerationMethod === VatRemunerationMethod.AGREED) {
      return null;
    }

    if (isNullish(vatRemunerationReceivedAccount)) {
      throw new InvoiceUndefinedVatRemunerationSystemAccountError(
        `Organization ${organizationId} has no VAT remuneration system account`,
      );
    }

    if (isNullish(vatTaxDueAccount)) {
      throw new InvoiceUndefinedVatTaxDueSystemAccountError(
        `Organization ${organizationId} has no VAT tax due system account`,
      );
    }

    return {
      remunerationReceived: vatRemunerationReceivedAccount,
      taxDue: vatTaxDueAccount,
    };
  }

  protected _assertAndMapInvoiceData({
    invoiceAccounts,
    invoiceId,
    postings: { invoice: invoicePostings, payments: paymentsPostings },
    vatAccounts,
  }: {
    invoiceAccounts: InvoiceSystemAccounts;
    invoiceId: Invoice["id"];
    postings: { invoice: PostingsSelect; payments: PostingsSelect };
    vatAccounts: Nullish<VatSystemAccounts>;
  }): InvoiceData {
    const buildInvoiceTotal = (): bigint => {
      const {
        receivable: { accountId: accountsReceivableId },
      } = invoiceAccounts;

      const accountsReceivablePosting = invoicePostings.find(
        ({ accountId }) => accountId === accountsReceivableId,
      );

      assertNonNullish(
        accountsReceivablePosting,
        `No debtor posting found on invoice ${invoiceId}'s journal entry`,
      );

      const { debit: invoiceTotal } = accountsReceivablePosting;

      return invoiceTotal;
    };

    const buildAlreadyPaid = (): bigint => {
      const {
        receivable: { accountId: accountsReceivableId },
      } = invoiceAccounts;

      // We cumulate the amount using the debtor credits rather than bank debits,
      // so overpayments stored in short-term debts don't count as invoice payments.
      return paymentsPostings
        .filter(({ accountId }) => accountId === accountsReceivableId)
        .reduce((sum, { credit }) => sum + credit, 0n);
    };

    const buildVat = (
      vatAccounts: VatSystemAccounts,
    ): {
      due: bigint;
      alreadyReceivedAmount: bigint;
    } => {
      const sourceVatPosting = invoicePostings.find(
        ({ accountId }) => accountId === vatAccounts.remunerationReceived.accountId,
      );

      assertNonNullish(
        sourceVatPosting,
        `No vat_remuneration_received posting found on invoice ${invoiceId}'s journal entry`,
      );

      const alreadyReceivedAmount = paymentsPostings
        .filter(({ accountId }) => accountId === vatAccounts.taxDue.accountId)
        .reduce((sum, { credit }) => sum + credit, 0n);

      const { credit: vatDue } = sourceVatPosting;

      return {
        due: vatDue,
        alreadyReceivedAmount,
      };
    };

    return {
      invoiceTotal: buildInvoiceTotal(),
      alreadyReceivedPaymentsTotal: buildAlreadyPaid(),
      vat: isNullish(vatAccounts)
        ? vatAccounts
        : { ...buildVat(vatAccounts), accounts: vatAccounts },
    };
  }
}
