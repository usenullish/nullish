import {
  type InvoiceData,
  type InvoiceDataVat,
  InvoiceService,
  type InvoiceServiceArgs,
  type InvoiceSystemAccounts,
  type JournalInsertEntryWithOrgId,
  type JournalInsertWithOrgId,
} from "./_invoice";
import {
  assertNonNullish,
  isNullish,
  nonNullish,
  type Nullable,
  type Nullish,
  type Option,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import { type Records } from "@usenullish/nullish-schema/records";
import {
  InvoiceStatus,
  InvoiceJournalEntryType,
  SystemAccountPurpose,
} from "@usenullish/nullish-schema/db";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { insertInvoiceJournalEntry } from "../../_helpers/invoice-journal";
import { type Services, ServicesSchema } from "@usenullish/nullish-schema/services";

type Invoice = Records["Billing"]["Invoices"]["Select"];

type PostingSelect = Records["Ledger"]["Postings"]["Select"];
type PostingsSelect = PostingSelect[];

type JournalInsertPostings = Composites["Journal"]["Insert"]["postings"];
type JournalInsertPosting = JournalInsertPostings[number];

type SystemAccount = Records["Ledger"]["SystemAccounts"]["Select"];
type SystemAccountsByPurpose = Record<SystemAccountPurpose, Option<SystemAccount>>;

interface UncollectibleSystemAccounts extends InvoiceSystemAccounts {
  badDebts: SystemAccount;
}

interface VatSystemAccounts {
  remunerationReceived: SystemAccount;
  taxDue: SystemAccount;
}

interface UncollectibleData extends Omit<InvoiceData, "vat"> {
  accounts: UncollectibleSystemAccounts;
  vat: Nullish<InvoiceDataVat & { unrealizedVatToReverse: bigint }>;
}

interface PrepareUncollectibleJournalArgs {
  invoice: Invoice;
  uncollectibleData: UncollectibleData;
}

export class UncollectibleInvoiceService extends InvoiceService {
  private constructor(args: InvoiceServiceArgs) {
    super(args);
  }

  static create(args: InvoiceServiceArgs): UncollectibleInvoiceService {
    return new this(args);
  }

  writeOff(args: Services["Invoices"]["Uncollectible"]["Args"]): Promise<Result<Invoice>> {
    return this._withViewRefresh(async () => {
      return await this.#writeOff(args);
    });
  }

  #writeOff(args: Services["Invoices"]["Uncollectible"]["Args"]): Promise<Result<Invoice>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 0. Validate the arguments
        const uncollectibleArgs =
          ServicesSchema.InvoicesSchema.UncollectibleInvoiceArgsSchema.parse(args);

        // 1. Load the invoice
        const invoice = await this._loadInvoice({ tx });

        // 2. Invoice must be open to be written off
        this._assertInvoiceStatus({ invoice, status: InvoiceStatus.OPEN });

        // 3. Load invoice postings (opening + payment postings)
        const postings = await this._loadPostings({
          tx,
          invoiceId: invoice.id,
        });

        // 4. Load system accounts & VAT methods
        const [systemAccounts, vatMethods] = await Promise.all([
          this._loadSystemAccounts({
            tx,
            organizationId: invoice.organizationId,
          }),
          nonNullish(invoice.vatRateId)
            ? this._loadVatMethods({
                tx,
                invoice,
              })
            : Promise.resolve(null),
        ]);

        // 5. Assert & map uncollectible & VAT system accounts separately
        const uncollectibleAccounts = this.#assertAndMapSystemAccounts({
          systemAccounts,
          organizationId: invoice.organizationId,
        });

        const vatAccounts = this._assertAndMapVatSystemAccounts({
          systemAccounts,
          organizationId: invoice.organizationId,
          vatMethods,
          invoice,
        });

        // 6. Map uncollectible balances & remaining unrealized VAT
        const uncollectibleData = this.#assertAndMapUncollectibleData({
          invoice,
          uncollectibleAccounts,
          vatAccounts,
          postings,
        });

        // 7. Prepare uncollectible journal entry
        const journal = this.#prepareJournal({
          invoice,
          uncollectibleData,
          ...uncollectibleArgs,
        });

        // 8. Create journal entry
        const {
          entry: { id: createdJournalId },
        } = await this._createJournal({ journal, tx });

        // 9. Record uncollectible journal link
        await insertInvoiceJournalEntry({
          tx,
          organizationId: invoice.organizationId,
          journalEntryId: createdJournalId,
          invoiceId: invoice.id,
          entryType: InvoiceJournalEntryType.UNCOLLECTIBLE,
        });

        // 10. Update status to "Uncollectible"
        return this._updateInvoiceStatus({
          tx,
          invoiceId: invoice.id,
          status: InvoiceStatus.UNCOLLECTIBLE,
        });
      });
    });
  }

  #assertAndMapSystemAccounts({
    systemAccounts: { debtor: accountsReceivable, bad_debts: badDebts },
    organizationId,
  }: {
    systemAccounts: SystemAccountsByPurpose;
    organizationId: Invoice["organizationId"];
  }): UncollectibleSystemAccounts {
    assertNonNullish(
      accountsReceivable,
      `Organization ${organizationId} has no debtor system account`,
    );

    assertNonNullish(badDebts, `Organization ${organizationId} has no bad_debts system account`);

    return {
      receivable: accountsReceivable,
      badDebts,
    };
  }

  #assertAndMapUncollectibleData({
    invoice: { id: invoiceId },
    uncollectibleAccounts,
    vatAccounts,
    postings,
  }: {
    invoice: Invoice;
    uncollectibleAccounts: UncollectibleSystemAccounts;
    vatAccounts: Nullish<VatSystemAccounts>;
    postings: { invoice: PostingsSelect; payments: PostingsSelect };
  }): UncollectibleData {
    const { vat: invoiceDataVat, ...invoiceDataRest } = this._assertAndMapInvoiceData({
      invoiceId,
      invoiceAccounts: uncollectibleAccounts,
      postings,
      vatAccounts,
    });

    const vat = isNullish(invoiceDataVat)
      ? invoiceDataVat
      : {
          ...invoiceDataVat,
          unrealizedVatToReverse:
            invoiceDataVat.due > invoiceDataVat.alreadyReceivedAmount
              ? invoiceDataVat.due - invoiceDataVat.alreadyReceivedAmount
              : 0n,
        };

    return {
      ...invoiceDataRest,
      accounts: uncollectibleAccounts,
      vat,
    };
  }

  #prepareJournal({
    invoice,
    uncollectibleData,
    validOn,
  }: PrepareUncollectibleJournalArgs & {
    validOn?: Services["Invoices"]["Uncollectible"]["Args"]["validOn"];
  }): JournalInsertWithOrgId {
    const { organizationId } = invoice;

    const entry: JournalInsertEntryWithOrgId = {
      organizationId,
      validOn: validOn ?? new Date(),
      reference: null,
    };

    return {
      entry,
      postings: this.#prepareJournalPostings({
        invoice,
        uncollectibleData,
      }),
    };
  }

  #prepareJournalPostings({
    invoice,
    uncollectibleData,
  }: PrepareUncollectibleJournalArgs): JournalInsertPostings {
    const {
      invoiceTotal,
      alreadyReceivedPaymentsTotal,
      accounts: {
        receivable: { accountId: accountsReceivableId },
        badDebts: { accountId: badDebtsAccountId },
      },
      vat,
    } = uncollectibleData;

    const { vatRateId, currency, exchangeRate } = invoice;

    const unrealizedVatToReverse = vat?.unrealizedVatToReverse ?? 0n;

    const remainingReceivable =
      invoiceTotal > alreadyReceivedPaymentsTotal
        ? invoiceTotal - alreadyReceivedPaymentsTotal
        : 0n;

    const netBadDebtLoss = remainingReceivable - unrealizedVatToReverse;

    const clearReceivablePosting: JournalInsertPosting = {
      accountId: accountsReceivableId,
      description: null,
      debit: 0n,
      credit: remainingReceivable,
      vatRateId: null,
      currency,
      exchangeRate,
    };

    const badDebtExpensePosting: JournalInsertPosting = {
      accountId: badDebtsAccountId,
      description: null,
      debit: netBadDebtLoss,
      credit: 0n,
      vatRateId: null,
      currency,
      exchangeRate,
    };

    const reverseUnrealizedVatPosting: Nullable<JournalInsertPosting> =
      nonNullish(vat?.accounts) && unrealizedVatToReverse > 0n
        ? {
            accountId: vat.accounts.remunerationReceived.accountId,
            description: null,
            debit: unrealizedVatToReverse,
            credit: 0n,
            vatRateId,
            currency,
            exchangeRate,
          }
        : null;

    return [
      clearReceivablePosting,
      badDebtExpensePosting,
      ...(nonNullish(reverseUnrealizedVatPosting) ? [reverseUnrealizedVatPosting] : []),
    ];
  }
}
