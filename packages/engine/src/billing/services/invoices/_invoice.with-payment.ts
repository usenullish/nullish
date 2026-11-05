import {
  type InvoiceData,
  InvoiceService,
  type InvoiceServiceArgs,
  type InvoiceSystemAccounts,
  type JournalInsertEntryWithOrgId,
  type JournalInsertWithOrgId,
  type VatSystemAccounts,
} from "./_invoice";
import {
  assertNonNullish,
  createTokenSchema,
  divideAndRoundToNearest,
  isNullish,
  nonNullish,
  type Nullable,
  type Nullish,
  type Option,
} from "@usenullish/nullish-common";
import { type Records } from "@usenullish/nullish-schema/records";
import type { Tx } from "@usenullish/nullish-db";
import {
  EXCHANGE_RATE_DECIMALS,
  InvoiceStatus,
  InvoiceJournalEntryType,
  SystemAccountPurpose,
  EXCHANGE_RATE_ONE,
} from "@usenullish/nullish-schema/db";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { type Services, ServicesSchema } from "@usenullish/nullish-schema/services";
import { insertInvoiceJournalEntry } from "../../_helpers/invoice-journal";
import { getAccountingSetting } from "../../../core/_helpers/accounting-settings";
import { getBankRelation } from "../../../core/_helpers/bank-relations";
import { getCurrency } from "../../../core/_helpers/currencies";
import { EngineError } from "../../../errors";

type Invoice = Records["Billing"]["Invoices"]["Select"];

type JournalEntrySelect = Records["Ledger"]["JournalEntries"]["Select"];
type PostingSelect = Records["Ledger"]["Postings"]["Select"];
type PostingsSelect = PostingSelect[];

type JournalInsertPostings = Composites["Journal"]["Insert"]["postings"];
type JournalInsertPosting = JournalInsertPostings[number];

type SystemAccount = Records["Ledger"]["SystemAccounts"]["Select"];
type Account = Records["Ledger"]["Accounts"]["Select"];
type BankRelation = Records["Core"]["BankRelations"]["Select"];
type SystemAccountsByPurpose = Record<SystemAccountPurpose, Option<SystemAccount>>;

type AccountingSettings = Records["Core"]["AccountingSettings"]["Select"];

interface PaySystemAccounts extends InvoiceSystemAccounts {
  bank: SystemAccount;
  shortTermDebts: SystemAccount;
  roundingDifferences: SystemAccount;
  exchangeRate: { losses: SystemAccount; gain: SystemAccount };
}

interface PreparePaymentPostingsArgs {
  invoice: Invoice;
  payment: Services["Invoices"]["Pay"]["Args"];
  payData: PayData;
}

interface PayData extends InvoiceData {
  accounts: Omit<PaySystemAccounts, "bank"> & {
    bank: { accountId: Account["id"] };
  };
  accounting: { baseCurrency: string; decimalsShift: number };
}

class InvoicePayCurrencyMismatchError extends EngineError {}
class InvoicePayExchangeRateMismatchError extends EngineError {}

export abstract class InvoiceWithPaymentService extends InvoiceService {
  protected constructor(args: InvoiceServiceArgs) {
    super(args);
  }

  protected async _pay({
    tx,
    bankRelationId,
    ...args
  }: Services["Invoices"]["Pay"]["Args"] & { tx: Tx }): Promise<{
    invoice: Invoice;
    journalEntryId: JournalEntrySelect["id"];
  }> {
    // 0. Validate the arguments
    const payment = ServicesSchema.InvoicesSchema.PayInvoiceArgsSchema.parse(args);

    // 1. Load the invoice
    const invoice = await this._loadInvoice({ tx });

    // 2. The invoice must be open to be paid
    this._assertInvoiceStatus({ invoice, status: InvoiceStatus.OPEN });

    // 3. The currency of the payment must match the invoice
    this.#assertCurrency({ invoice, payment: args });

    // 4. Load the posting linked with the invoice
    // and all those related to payments linked with the invoice
    // (client might pay multiple times)
    const postings = await this._loadPostings({
      tx,
      invoiceId: invoice.id,
    });

    // 5. Load the system accounts
    const systemAccounts = await this._loadSystemAccounts({
      tx,
      organizationId: invoice.organizationId,
    });

    // 6. Load the vat methods and accounting settings of the organization
    const [vatMethods, accountingSetting, currency] = await Promise.all([
      nonNullish(invoice.vatRateId)
        ? this._loadVatMethods({
            tx,
            invoice,
          })
        : // If the invoice does not user VAT there is not VAT methods to load or use
          Promise.resolve(null),
      this.#loadAccountingSetting({
        tx,
        organizationId: invoice.organizationId,
      }),
      getCurrency({ tx, code: invoice.currency }),
    ]);

    const baseCurrency = await getCurrency({
      tx,
      code: accountingSetting.baseCurrency,
    });

    // 7. Assert + map system accounts and vat
    const invoiceAccounts = this.#assertAndMapSystemAccounts({
      systemAccounts,
      organizationId: invoice.organizationId,
    });

    const vatAccounts = this._assertAndMapVatSystemAccounts({
      systemAccounts,
      organizationId: invoice.organizationId,
      vatMethods,
      invoice,
    });

    // 8. Assert the exchange rate is one if the base currency is the same
    // as the one of the payment (which is the same as the invoice)
    this.#assertExchangeRate({
      payment,
      baseCurrency: accountingSetting.baseCurrency,
    });

    // 9. Assert and map invoice balance aka payment progress (client might pay multiple times)
    const bankRelation = isNullish(bankRelationId)
      ? undefined
      : await getBankRelation({ tx, id: bankRelationId });

    const payData = this.#assertAndMapPayData({
      payAccounts: invoiceAccounts,
      bankRelation,
      vatAccounts,
      invoiceId: invoice.id,
      postings,
      accountingSetting,
      decimalsShift: baseCurrency.decimals - currency.decimals,
    });

    // 10. Prepare journal
    const journal = this.#prepareJournal({
      invoice,
      payment,
      vatAccounts,
      payData,
    });

    // 11. Create journal ("insert into DB")
    const {
      entry: { id: createdJournalId },
    } = await this._createJournal({ journal, tx });

    // 12. Record the payment
    await this.#recordPayment({
      tx,
      organizationId: invoice.organizationId,
      journalEntryId: createdJournalId,
      invoiceId: invoice.id,
    });

    // 13. If not fully paid, the invoice remains "Open"
    const fullyPaid = payData.alreadyReceivedPaymentsTotal + payment.amount >= payData.invoiceTotal;
    if (!fullyPaid) {
      return { invoice, journalEntryId: createdJournalId };
    }

    // 14. Update invoice status to "Paid"
    const paidInvoice = await this._updateInvoiceStatus({
      tx,
      invoiceId: invoice.id,
      status: InvoiceStatus.PAID,
    });

    return { invoice: paidInvoice, journalEntryId: createdJournalId };
  }

  #assertAndMapSystemAccounts({
    systemAccounts: {
      debtor: accountsReceivable,
      bank_account: bankAccount,
      creditor: shortTermDebtsAccount,
      rounding_differences: roundingDifferences,
      exchange_rate_losses: exchangeRateLosses,
      exchange_rate_gains: exchangeRateGains,
    },
    organizationId,
  }: {
    systemAccounts: SystemAccountsByPurpose;
  } & Pick<Invoice, "organizationId">): PaySystemAccounts {
    assertNonNullish(
      accountsReceivable,
      `Organization ${organizationId} has no debtor system account`,
    );

    assertNonNullish(
      bankAccount,
      `Organization ${organizationId} has no bank_account system account`,
    );

    assertNonNullish(
      shortTermDebtsAccount,
      `Organization ${organizationId} has no creditor system account`,
    );

    assertNonNullish(
      roundingDifferences,
      `Organization ${organizationId} has no rounding_differences system account`,
    );

    assertNonNullish(
      exchangeRateLosses,
      `Organization ${organizationId} has no exchange_rate_losses system account`,
    );

    assertNonNullish(
      exchangeRateGains,
      `Organization ${organizationId} has no exchange_rate_gains system account`,
    );

    return {
      receivable: accountsReceivable,
      bank: bankAccount,
      shortTermDebts: shortTermDebtsAccount,
      roundingDifferences,
      exchangeRate: { losses: exchangeRateLosses, gain: exchangeRateGains },
    };
  }

  #assertCurrency({
    invoice: { currency: invoiceCurrency },
    payment: { currency: paymentCurrency },
  }: { invoice: Invoice } & Pick<PreparePaymentPostingsArgs, "payment">) {
    if (paymentCurrency !== invoiceCurrency) {
      throw new InvoicePayCurrencyMismatchError(
        `Payment currency (${paymentCurrency}) must match invoice currency (${invoiceCurrency})`,
      );
    }
  }

  #assertExchangeRate({
    payment: { currency: paymentCurrency, exchangeRate: paymentExchangeRate },
    baseCurrency,
  }: Pick<PreparePaymentPostingsArgs, "payment"> & { baseCurrency: string }) {
    if (paymentCurrency === baseCurrency && paymentExchangeRate !== 1) {
      throw new InvoicePayExchangeRateMismatchError(
        `Payment currency (${paymentCurrency}) matches the organization's base currency (${baseCurrency}) but exchangeRate is ${paymentExchangeRate}, expected 1`,
      );
    }
  }

  #assertAndMapPayData({
    payAccounts: { bank, ...payAccounts },
    bankRelation,
    invoiceId,
    postings,
    vatAccounts,
    accountingSetting,
    decimalsShift,
  }: {
    payAccounts: PaySystemAccounts;
    bankRelation: Option<BankRelation>;
    invoiceId: Invoice["id"];
    postings: { invoice: PostingsSelect; payments: PostingsSelect };
    vatAccounts: Nullish<VatSystemAccounts>;
    accountingSetting: AccountingSettings;
    decimalsShift: PayData["accounting"]["decimalsShift"];
  }): PayData {
    const buildAccounting = (): PayData["accounting"] => {
      const { baseCurrency } = accountingSetting;

      return {
        baseCurrency,
        decimalsShift,
      };
    };

    return {
      ...this._assertAndMapInvoiceData({
        invoiceId,
        invoiceAccounts: payAccounts,
        postings,
        vatAccounts,
      }),
      accounts: {
        ...payAccounts,
        bank: { accountId: bankRelation?.accountId ?? bank.accountId },
      },
      accounting: buildAccounting(),
    };
  }

  #prepareJournal({
    payment,
    invoice,
    ...rest
  }: PreparePaymentPostingsArgs & {
    vatAccounts: Nullish<VatSystemAccounts>;
  }): JournalInsertWithOrgId {
    const { organizationId } = invoice;
    const { validOn } = payment;

    const journalEntry: JournalInsertEntryWithOrgId = {
      organizationId,
      validOn: validOn ?? new Date(),
      reference: null,
    };

    return {
      entry: journalEntry,
      postings: this.#prepareJournalPostings({
        payment,
        invoice,
        ...rest,
      }),
    };
  }

  #prepareJournalPostings({
    vatAccounts,
    payData: { vat, ...payDataRest },
    ...rest
  }: PreparePaymentPostingsArgs & {
    vatAccounts: Nullish<VatSystemAccounts>;
  }): JournalInsertPostings {
    if (isNullish(vatAccounts)) {
      return this.#prepareJournalPostingsWithoutVat({
        payData: { vat, ...payDataRest },
        ...rest,
      });
    }

    assertNonNullish(vat);

    return this.#prepareJournalPostingsWithVat({
      vatAccounts,
      payData: { vat, ...payDataRest },
      ...rest,
    });
  }

  #prepareJournalPostingsWithoutVat(args: PreparePaymentPostingsArgs): JournalInsertPostings {
    // Without VAT or with the VAT setting set to VatRemunerationMethod.AGREED - i.e. already booked and due - the
    // behavior is the same. The amount goes on the banking account with the credit on the receivable. Potential overpayment
    // goes on a creditor account.
    return this.#preparePaymentPostings(args);
  }

  #prepareJournalPostingsWithVat({
    payment,
    invoice,
    payData,
    vatAccounts,
    ...rest
  }: Omit<PreparePaymentPostingsArgs, "payData"> & {
    payData: Omit<PayData, "vat"> & {
      vat: NonNullable<PayData["vat"]>;
    };
    vatAccounts: VatSystemAccounts;
  }): JournalInsertPostings {
    const {
      invoiceTotal,
      alreadyReceivedPaymentsTotal,
      vat: { due: vatDue, alreadyReceivedAmount: alreadyReceivedVatDueAmount },
    } = payData;

    const { amount: paymentAmount } = payment;

    const totalReceivedAfterThisPayment = alreadyReceivedPaymentsTotal + paymentAmount;

    // Under Swiss cash-basis VAT (prestations reçues), VAT becomes due strictly proportional
    // to cumulative payments received: (Cumulative Received * Total Invoice VAT) / Total Invoice TTC.
    //
    // Example: Invoice 108 CHF TTC (100 HT + 8 VAT)
    // - Payment of 5 CHF   => (5 * 8) / 108 = 0.37 CHF VAT due
    // - Payment of 50 CHF  => (50 * 8) / 108 = 3.70 CHF VAT due
    // - Overpayment 120 CHF => Capped at 8.00 CHF VAT maximum
    const vatDueCumulative = divideAndRoundToNearest({
      value: totalReceivedAfterThisPayment * vatDue,
      divisor: invoiceTotal,
    });

    const cappedVatDueCumulative = vatDueCumulative > vatDue ? vatDue : vatDueCumulative;

    const remainingVatDue =
      cappedVatDueCumulative > alreadyReceivedVatDueAmount
        ? cappedVatDueCumulative - alreadyReceivedVatDueAmount
        : 0n;

    return [
      ...this.#preparePaymentPostings({
        ...rest,
        invoice,
        payData,
        payment,
      }),
      ...(remainingVatDue > 0n
        ? this.#prepareVatPostings({
            vatAmountDue: remainingVatDue,
            vatAccounts,
            invoice,
            payment,
          })
        : []),
    ];
  }

  #prepareVatPostings({
    vatAccounts: {
      taxDue: { accountId: vatTaxDueAccountId },
      remunerationReceived: { accountId: vatRemunerationReceivedAccountId },
    },
    invoice: { vatRateId },
    payment: { exchangeRate: paymentExchangeRate, currency: paymentCurrency },
    vatAmountDue,
  }: Pick<PreparePaymentPostingsArgs, "invoice" | "payment"> & {
    vatAccounts: VatSystemAccounts;
    vatAmountDue: bigint;
  }): JournalInsertPostings {
    const vatRemunerationReceivedPosting: JournalInsertPosting = {
      accountId: vatRemunerationReceivedAccountId,
      description: null,
      debit: vatAmountDue,
      credit: 0n,
      vatRateId,
      currency: paymentCurrency,
      exchangeRate: paymentExchangeRate,
    };

    const vatTaxDuePosting: JournalInsertPosting = {
      accountId: vatTaxDueAccountId,
      description: null,
      debit: 0n,
      credit: vatAmountDue,
      vatRateId,
      currency: paymentCurrency,
      exchangeRate: paymentExchangeRate,
    };

    return [vatRemunerationReceivedPosting, vatTaxDuePosting];
  }

  #preparePaymentPostings({
    invoice,
    payment,
    payData,
  }: PreparePaymentPostingsArgs): JournalInsertPostings {
    const { currency: invoiceCurrency, exchangeRate: invoiceExchangeRate } = invoice;

    const {
      amount: paymentAmount,
      currency: paymentCurrency,
      exchangeRate: paymentExchangeRate,
    } = payment;

    const {
      accounts: {
        receivable: { accountId: accountsReceivableId },
        bank: { accountId: bankLedgerAccountId },
      },
    } = payData;

    const excessAmountPosting = this.#prepareOverpaymentPosting({
      payment,
      payData,
    });

    // If the client paid more than the total of the invoice, the receivable is limited and the overpaid
    // is applied to another account (the excessAmountPosting).
    const accountsReceivableAmount = paymentAmount - (excessAmountPosting?.credit ?? 0n);

    const bankPosting: JournalInsertPosting = {
      accountId: bankLedgerAccountId,
      description: null,
      debit: paymentAmount,
      credit: 0n,
      vatRateId: null,
      currency: paymentCurrency, // We asserted earlier the currency of the payment is the same as the invoice
      exchangeRate: paymentExchangeRate,
    };

    const accountsReceivablePosting: JournalInsertPosting = {
      accountId: accountsReceivableId,
      description: null,
      debit: 0n,
      credit: accountsReceivableAmount,
      vatRateId: null,
      currency: invoiceCurrency,
      exchangeRate: invoiceExchangeRate,
    };

    const exchangeRateRelatedPostings =
      invoiceExchangeRate === EXCHANGE_RATE_ONE && paymentExchangeRate === EXCHANGE_RATE_ONE
        ? null
        : this.#prepareExchangeRatePostings({
            invoice,
            payData,
            payment,
            accountsReceivableAmount,
            bankPosting,
            accountsReceivablePosting,
            excessAmountPosting,
          });

    return [
      bankPosting,
      accountsReceivablePosting,
      ...(nonNullish(excessAmountPosting) ? [excessAmountPosting] : []),
      ...(nonNullish(exchangeRateRelatedPostings) ? exchangeRateRelatedPostings : []),
    ];
  }

  #prepareOverpaymentPosting({
    payData: {
      invoiceTotal,
      alreadyReceivedPaymentsTotal,
      accounts: {
        shortTermDebts: { accountId: shortTermDebtsAccountId },
      },
    },
    payment: {
      amount: paymentAmount,
      currency: paymentCurrency,
      exchangeRate: paymentExchangeRate,
    },
  }: Pick<PreparePaymentPostingsArgs, "payData" | "payment">): Nullable<JournalInsertPosting> {
    const remainingReceivableAmount =
      invoiceTotal > alreadyReceivedPaymentsTotal
        ? invoiceTotal - alreadyReceivedPaymentsTotal
        : 0n;

    const excessAmount =
      paymentAmount > remainingReceivableAmount ? paymentAmount - remainingReceivableAmount : 0n;

    // Unlikely smaller than zero
    if (excessAmount <= 0n) {
      return null;
    }

    const excessAmountPosting: JournalInsertPosting = {
      accountId: shortTermDebtsAccountId,
      description: null,
      debit: 0n,
      credit: excessAmount,
      vatRateId: null,
      currency: paymentCurrency,
      exchangeRate: paymentExchangeRate,
    };

    return excessAmountPosting;
  }

  #prepareExchangeRatePostings({
    payment,
    invoice,
    payData,
    accountsReceivableAmount,
    bankPosting,
    accountsReceivablePosting,
    excessAmountPosting,
  }: PreparePaymentPostingsArgs & {
    accountsReceivableAmount: bigint;
    bankPosting: JournalInsertPosting;
    accountsReceivablePosting: JournalInsertPosting;
    excessAmountPosting: Nullable<JournalInsertPosting>;
  }): JournalInsertPostings {
    const exchangeRateDifferencePosting = this.#prepareExchangeRateDifferencePosting({
      invoice,
      payData,
      payment,
      accountsReceivableAmount,
    });

    const roundingDifferencePosting = this.#prepareExchangeRateRoundingDifferencePosting({
      payData,
      bankPosting,
      accountsReceivablePosting,
      excessAmountPosting,
      exchangeRateDifferencePosting,
    });

    return [
      ...(nonNullish(exchangeRateDifferencePosting) ? [exchangeRateDifferencePosting] : []),
      ...(nonNullish(roundingDifferencePosting) ? [roundingDifferencePosting] : []),
    ];
  }

  #prepareExchangeRateDifferencePosting({
    payment: { exchangeRate: paymentExchangeRate },
    invoice,
    payData: {
      accounts: {
        exchangeRate: {
          losses: { accountId: lossesAccountId },
          gain: { accountId: gainAccountId },
        },
      },
      accounting: { baseCurrency, decimalsShift },
    },
    accountsReceivableAmount,
  }: PreparePaymentPostingsArgs & {
    accountsReceivableAmount: bigint;
  }): Nullable<JournalInsertPosting> {
    const { exchangeRate: invoiceExchangeRate } = invoice;

    const receivableAmountAtPaymentRate = this.#toBaseAmount({
      amount: accountsReceivableAmount,
      exchangeRate: paymentExchangeRate,
      decimalsShift,
    });

    const receivableAmountAtInvoiceRate = this.#toBaseAmount({
      amount: accountsReceivableAmount,
      exchangeRate: invoiceExchangeRate,
      decimalsShift,
    });

    const exchangeRateDifference = receivableAmountAtPaymentRate - receivableAmountAtInvoiceRate;

    if (exchangeRateDifference === 0n) {
      return null;
    }

    const exchangeRateDifferencePosting: JournalInsertPosting = {
      accountId: exchangeRateDifference >= 0n ? gainAccountId : lossesAccountId,
      description: null,
      debit: exchangeRateDifference < 0n ? -exchangeRateDifference : 0n,
      credit: exchangeRateDifference > 0n ? exchangeRateDifference : 0n,
      vatRateId: null,
      currency: baseCurrency,
      exchangeRate: EXCHANGE_RATE_ONE,
    };

    return exchangeRateDifferencePosting;
  }

  #prepareExchangeRateRoundingDifferencePosting({
    payData: {
      accounts: {
        roundingDifferences: { accountId: roundingDifferencesAccountId },
      },
      accounting: { baseCurrency, decimalsShift },
    },
    bankPosting,
    accountsReceivablePosting,
    excessAmountPosting,
    exchangeRateDifferencePosting,
  }: Pick<PreparePaymentPostingsArgs, "payData"> & {
    bankPosting: JournalInsertPosting;
    accountsReceivablePosting: JournalInsertPosting;
    excessAmountPosting: Nullable<JournalInsertPosting>;
    exchangeRateDifferencePosting: Nullable<JournalInsertPosting>;
  }): Nullable<JournalInsertPosting> {
    const bankBaseAmount = this.#toBaseAmount({
      amount: bankPosting.debit,
      exchangeRate: bankPosting.exchangeRate,
      decimalsShift,
    });

    const accountsReceivableBaseAmount = this.#toBaseAmount({
      amount: accountsReceivablePosting.credit,
      exchangeRate: accountsReceivablePosting.exchangeRate,
      decimalsShift,
    });

    const overpaymentBaseAmount = excessAmountPosting
      ? this.#toBaseAmount({
          amount: excessAmountPosting.credit,
          exchangeRate: excessAmountPosting.exchangeRate,
          decimalsShift,
        })
      : 0n;

    const exchangeRateDifferenceBaseAmount =
      (exchangeRateDifferencePosting?.credit ?? 0n) - (exchangeRateDifferencePosting?.debit ?? 0n);

    // The sum of all base-currency debits must equal the sum of all base-currency credits.
    // Therefore, we are checking if there is any rounding differences due to the usage of a
    // foreign exchange rate.
    const roundingDifference =
      bankBaseAmount -
      (accountsReceivableBaseAmount + overpaymentBaseAmount + exchangeRateDifferenceBaseAmount);

    if (roundingDifference === 0n) {
      return null;
    }

    return {
      accountId: roundingDifferencesAccountId,
      description: null,
      debit: roundingDifference < 0n ? -roundingDifference : 0n,
      credit: roundingDifference > 0n ? roundingDifference : 0n,
      vatRateId: null,
      currency: baseCurrency,
      exchangeRate: EXCHANGE_RATE_ONE,
    };
  }

  #toBaseAmount({
    amount,
    exchangeRate,
    decimalsShift,
  }: {
    amount: bigint;
    exchangeRate: number;
    decimalsShift: PayData["accounting"]["decimalsShift"];
  }): bigint {
    const EXCHANGE_RATE_SCALE = 10n ** BigInt(EXCHANGE_RATE_DECIMALS);

    const value = amount * this.#scaleExchangeRate(exchangeRate);

    if (decimalsShift < 0) {
      return divideAndRoundToNearest({
        value,
        divisor: EXCHANGE_RATE_SCALE * 10n ** BigInt(-decimalsShift),
      });
    }

    return divideAndRoundToNearest({
      value: value * 10n ** BigInt(decimalsShift),
      divisor: EXCHANGE_RATE_SCALE,
    });
  }

  #scaleExchangeRate(rate: number): bigint {
    const exchangeRateSchema = createTokenSchema({
      decimals: EXCHANGE_RATE_DECIMALS,
    });
    return exchangeRateSchema.parse(rate.toFixed(EXCHANGE_RATE_DECIMALS));
  }

  async #recordPayment(args: {
    organizationId: Invoice["organizationId"];
    journalEntryId: JournalEntrySelect["id"];
    invoiceId: Invoice["id"];
    tx: Tx;
  }): Promise<void> {
    await insertInvoiceJournalEntry({
      ...args,
      entryType: InvoiceJournalEntryType.PAYMENT,
    });
  }

  async #loadAccountingSetting(
    args: { tx: Tx } & Pick<Invoice, "organizationId">,
  ): Promise<AccountingSettings> {
    return await getAccountingSetting(args);
  }
}
