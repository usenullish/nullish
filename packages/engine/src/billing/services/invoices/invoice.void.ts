import { InvoiceService, type InvoiceServiceArgs, type JournalInsertWithOrgId } from "./_invoice";
import { assertArrayEmpty, type Result, tryCatch } from "@usenullish/nullish-common";
import { type Records } from "@usenullish/nullish-schema/records";
import type { Tx } from "@usenullish/nullish-db";
import { InvoiceStatus, InvoiceJournalEntryType } from "@usenullish/nullish-schema/db";
import type { Composites } from "@usenullish/nullish-schema/composites";
import {
  insertInvoiceJournalEntry,
  listInvoiceJournalEntries,
} from "../../_helpers/invoice-journal";
import { type Services, ServicesSchema } from "@usenullish/nullish-schema/services";

type Invoice = Records["Billing"]["Invoices"]["Select"];
type JournalEntrySelect = Records["Ledger"]["JournalEntries"]["Select"];
type PostingSelect = Records["Ledger"]["Postings"]["Select"];

type JournalInsertPostings = Composites["Journal"]["Insert"]["postings"];

export class VoidInvoiceService extends InvoiceService {
  private constructor(args: InvoiceServiceArgs) {
    super(args);
  }

  static create(args: InvoiceServiceArgs): VoidInvoiceService {
    return new this(args);
  }

  void(args: Services["Invoices"]["Void"]["Args"]): Promise<Result<Invoice>> {
    return this._withViewRefresh(async () => {
      return await this.#void(args);
    });
  }

  #void(args: Services["Invoices"]["Void"]["Args"]): Promise<Result<Invoice>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 0. Validate the arguments
        const voidArgs = ServicesSchema.InvoicesSchema.VoidInvoiceArgsSchema.parse(args);

        // 1. Load the invoice
        const invoice = await this._loadInvoice({ tx });

        // 2. The invoice must be open to be voided
        this._assertInvoiceStatus({ invoice, status: InvoiceStatus.OPEN });

        // 3. An invoice can only be voided if it was never partially paid,
        // regardless of status, an invoice can carry payments before
        // reaching "paid" (its status only changes once fully paid).
        await this.#assertNoPayments({ tx, invoiceId: invoice.id });

        // 4. Load the opening journal entry and its postings
        const invoiceJournal = await this._loadInvoiceOpeningJournal({
          tx,
          invoiceId: invoice.id,
        });

        // 5. Load the postings of the journal related to the opened invoice
        const postings = await this._loadJournalPostings({
          tx,
          journalId: invoiceJournal.id,
        });

        // 6. Build the reversing entry (swap every debit and credit)
        const journal = this.#prepareReversingJournal({
          invoice,
          postings,
          ...voidArgs,
        });

        // 7. Create the reversing journal entry
        const {
          entry: { id: createdJournalId },
        } = await this._createJournal({ journal, tx });

        // 8. Record the void link between the invoice and the created journal
        await this.#recordVoid({
          tx,
          organizationId: invoice.organizationId,
          journalEntryId: createdJournalId,
          invoiceId: invoice.id,
        });

        // 9. Update invoice status to "Void"
        return this._updateInvoiceStatus({
          tx,
          invoiceId: invoice.id,
          status: InvoiceStatus.VOID,
        });
      });
    });
  }

  async #assertNoPayments({ tx, invoiceId }: { tx: Tx; invoiceId: Invoice["id"] }): Promise<void> {
    const payments = await listInvoiceJournalEntries({
      tx,
      invoiceId,
      entryType: InvoiceJournalEntryType.PAYMENT,
    });

    assertArrayEmpty(payments, `Invoice ${invoiceId} has existing payments and cannot be voided`);
  }

  #prepareReversingJournal({
    invoice: { organizationId },
    postings,
    validOn,
  }: {
    invoice: Invoice;
    postings: PostingSelect[];
    validOn?: Services["Invoices"]["Void"]["Args"]["validOn"];
  }): JournalInsertWithOrgId {
    const reversedPostings: JournalInsertPostings = postings.map(
      ({ id, journalEntryId, createdAt, updatedAt, version, debit, credit, ...rest }) => ({
        ...rest,
        description: null,
        debit: credit,
        credit: debit,
      }),
    );

    return {
      entry: {
        organizationId,
        validOn: validOn ?? new Date(),
        reference: null,
      },
      postings: reversedPostings,
    };
  }

  async #recordVoid({
    organizationId,
    journalEntryId,
    invoiceId,
    tx,
  }: {
    organizationId: Invoice["organizationId"];
    journalEntryId: JournalEntrySelect["id"];
    invoiceId: Invoice["id"];
    tx: Tx;
  }): Promise<void> {
    await insertInvoiceJournalEntry({
      tx,
      organizationId,
      journalEntryId,
      invoiceId,
      entryType: InvoiceJournalEntryType.VOID,
    });
  }
}
