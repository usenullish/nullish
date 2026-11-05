import { type Tx } from "@usenullish/nullish-db";
import {
  assertNonNullish,
  divideAndRoundToNearest,
  isNullish,
  nonNullish,
  type Option,
} from "@usenullish/nullish-common";
import {
  INPUT_TAX_TYPES,
  RATE_SCALE_IN_PERCENT,
  SystemAccountPurpose,
  VatPaymentMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import { type Composites } from "@usenullish/nullish-schema/composites";
import { type Records } from "@usenullish/nullish-schema/records";
import { getVatMethods } from "../../../core/_helpers/vat";
import { parseRate } from "../../../_utils/vat";
import { getSystemAccounts } from "../../_helpers/accounts-system";
import {
  insertPostingManualVatPostings,
  insertVatPostings,
  type PreparedVatPosting,
} from "../../_helpers/journal-vat";
import { EngineError } from "../../../errors";

type SelectJournal = Composites["Journal"]["Select"];
type Posting = SelectJournal["postings"][number];

type VatRate = Records["Core"]["VatRates"]["Select"];
type VatMethods = Records["Core"]["VatMethods"]["Select"];
type SystemAccount = Records["Ledger"]["SystemAccounts"]["Select"];
type SystemAccountsByPurpose = Record<SystemAccountPurpose, Option<SystemAccount>>;

type VatPosting = Pick<Posting, "accountId" | "debit" | "credit" | "vatRateId">;

export type VatRates = [VatRate, ...VatRate[]];

interface JournalVat {
  rates: VatRates;
  methods: VatMethods;
  systemAccounts: SystemAccountsByPurpose;
}

class JournalVatMethodsError extends EngineError {}
class JournalVatRateError extends EngineError {}
class JournalVatSystemAccountError extends EngineError {}

export abstract class JournalOperation {
  protected readonly _tx: Tx;

  protected constructor({ tx }: { tx: Tx }) {
    this._tx = tx;
  }

  protected async _loadAndAssertVat({
    organizationId,
    validOn,
    rates,
  }: {
    organizationId: SelectJournal["entry"]["organizationId"];
    validOn: SelectJournal["entry"]["validOn"];
    rates: VatRates;
  }): Promise<JournalVat> {
    this._assertVatRatesValidOn({ rates, validOn });

    const [methods, systemAccounts] = await Promise.all([
      getVatMethods({ tx: this._tx, organizationId, validOn }),
      getSystemAccounts({ tx: this._tx, organizationId }),
    ]);

    this._assertVatMethods(methods, { organizationId, validOn });

    return { rates, methods, systemAccounts };
  }

  protected _assertVatRatesValidOn({
    rates,
    validOn,
  }: {
    rates: VatRate[];
    validOn: SelectJournal["entry"]["validOn"];
  }): void {
    const invalid = rates.find(
      ({ startOn, endOn }) =>
        startOn.getTime() > validOn.getTime() ||
        (nonNullish(endOn) && endOn.getTime() < validOn.getTime()),
    );

    if (nonNullish(invalid)) {
      throw new JournalVatRateError(
        `VAT rate ${invalid.code} is not valid on ${validOn.toISOString()}`,
      );
    }
  }

  protected _assertVatMethods(
    methods: Option<VatMethods>,
    {
      organizationId,
      validOn,
    }: {
      organizationId: SelectJournal["entry"]["organizationId"];
      validOn: SelectJournal["entry"]["validOn"];
    },
  ): asserts methods is VatMethods {
    if (isNullish(methods)) {
      throw new JournalVatMethodsError(
        `A VAT rate is used but organization ${organizationId} has no VAT methods on ${validOn.toISOString()}`,
      );
    }
  }

  protected async _insertVatPostings({
    journal,
    vat,
  }: {
    journal: SelectJournal;
    vat: JournalVat;
  }): Promise<Posting[]> {
    // 1. Prepare the new VAT postings. In the UI the user is asked to select on which account it has to be applied
    // For example:
    // - the user enters 4400 / 1020 108.10 VM81
    // - the UI asks on which account and say user pick 4400
    // - then submitted is two postings: 4400 debit 10810 with vatRateId: VM81, and 1020 credit 10810 with vatRateId: null
    const preparedVatPostings = this.#prepareVatPostings({
      journal,
      ...vat,
    });

    // 2. Insert the postings for the journal that are generated
    const insertedVatPostings = await insertVatPostings({
      tx: this._tx,
      entry: journal.entry,
      preparedVatPostings,
    });

    // 3. Record the link between the original postings and their vat postings
    await insertPostingManualVatPostings({
      tx: this._tx,
      organizationId: journal.entry.organizationId,
      insertedVatPostings,
    });

    return insertedVatPostings.map(({ vatPosting }) => vatPosting);
  }

  #prepareVatPostings({
    journal: { entry, postings },
    rates,
    methods,
    systemAccounts,
  }: {
    journal: SelectJournal;
  } & JournalVat): PreparedVatPosting[] {
    return postings.flatMap((posting) => {
      const rate = rates.find(({ id }) => id === posting.vatRateId);

      // A posting without an input tax or acquisition tax rate (e.g. the bank side of a purchase,
      // or a posting with another VAT rate) gets no VAT postings.
      // 4400 Expense   108.10   VM81   ← input tax: gets VAT postings
      // 1020 Bank      108.10          ← no rate: saved as is
      if (isNullish(rate)) {
        return [];
      }

      return this.#buildVatPostings({
        organizationId: entry.organizationId,
        posting,
        rate,
        methods,
        systemAccounts,
      }).map((vatPosting) => ({
        postingId: posting.id,
        vatPosting: {
          ...vatPosting,
          description: posting.description,
          currency: posting.currency,
          exchangeRate: posting.exchangeRate,
        },
      }));
    });
  }

  #buildVatPostings({
    organizationId,
    posting,
    rate,
    methods,
    systemAccounts,
  }: {
    organizationId: SelectJournal["entry"]["organizationId"];
    posting: Posting;
    rate: VatRate;
    methods: VatMethods;
    systemAccounts: SystemAccountsByPurpose;
  }): VatPosting[] {
    // A posting has an amount on one side only, the other is zero (checks debit_or_credit_not_both
    // and debit_or_credit_one_positive on ledger.postings).
    const amount = posting.debit > 0n ? posting.debit : posting.credit;

    const percent = parseRate(rate.rate);

    if (INPUT_TAX_TYPES.includes(rate.type)) {
      return this.#buildInputTaxVatPostings({ posting, rate, amount, percent, systemAccounts });
    }

    if (rate.type === VatType.SALES_TAX_DUE) {
      return this.#buildSalesTaxVatPostings({
        organizationId,
        posting,
        rate,
        amount,
        percent,
        systemAccounts,
      });
    }

    if (rate.type === VatType.NET_RATE_TAX) {
      return this.#buildNetRateTaxVatPostings({
        organizationId,
        posting,
        rate,
        amount,
        systemAccounts,
      });
    }

    return this.#buildAcquisitionTaxVatPostings({
      organizationId,
      posting,
      rate,
      amount,
      percent,
      methods,
      systemAccounts,
    });
  }

  #buildInputTaxVatPostings({
    posting,
    rate,
    amount,
    percent,
    systemAccounts,
  }: {
    posting: Posting;
    rate: VatRate;
    amount: bigint;
    percent: bigint;
    systemAccounts: SystemAccountsByPurpose;
  }): VatPosting[] {
    const tax = divideAndRoundToNearest({
      value: amount * percent,
      divisor: RATE_SCALE_IN_PERCENT + percent,
    });

    return this.#toVatPostings({
      posting,
      tax,
      taxAccountId: this.#inputTaxAccount({ rate, systemAccounts }).accountId,
      counterAccountId: posting.accountId,
      vatRateId: rate.id,
    });
  }

  // Sales tax with the effective method: the posting is the gross amount, VAT included, as for the
  // input tax. The VAT is taken out of it and owed to the tax administration.
  // e.g. a sale of 108.10 credited with UN81 (8.1%) gives 2200 credit 8.10 and sale debit 8.10.
  #buildSalesTaxVatPostings({
    organizationId,
    posting,
    rate,
    amount,
    percent,
    systemAccounts,
  }: {
    organizationId: SelectJournal["entry"]["organizationId"];
    posting: Posting;
    rate: VatRate;
    amount: bigint;
    percent: bigint;
    systemAccounts: SystemAccountsByPurpose;
  }): VatPosting[] {
    const tax = divideAndRoundToNearest({
      value: amount * percent,
      divisor: RATE_SCALE_IN_PERCENT + percent,
    });

    return this.#toVatPostings({
      posting,
      tax,
      taxAccountId: this.#vatTaxDueAccount({ organizationId, systemAccounts }).accountId,
      counterAccountId: posting.accountId,
      vatRateId: rate.id,
    });
  }

  // Net rate tax: the posting is the gross amount, VAT included, and the VAT owed is the net rate
  // granted by the tax administration applied to it, as when an invoice is opened.
  // e.g. a sale of 108.10 credited with a net rate of 6.2% gives 2200 credit 6.70 and sale debit 6.70.
  #buildNetRateTaxVatPostings({
    organizationId,
    posting,
    rate,
    amount,
    systemAccounts,
  }: {
    organizationId: SelectJournal["entry"]["organizationId"];
    posting: Posting;
    rate: VatRate;
    amount: bigint;
    systemAccounts: SystemAccountsByPurpose;
  }): VatPosting[] {
    assertNonNullish(rate.netRate, `VAT rate ${rate.code} has no net rate`);

    const netPercent = parseRate(rate.netRate);

    const tax = divideAndRoundToNearest({
      value: amount * netPercent,
      divisor: RATE_SCALE_IN_PERCENT,
    });

    return this.#toVatPostings({
      posting,
      tax,
      taxAccountId: this.#vatTaxDueAccount({ organizationId, systemAccounts }).accountId,
      counterAccountId: posting.accountId,
      vatRateId: rate.id,
    });
  }

  #buildAcquisitionTaxVatPostings({
    organizationId,
    posting,
    rate,
    amount,
    percent,
    methods,
    systemAccounts,
  }: {
    organizationId: SelectJournal["entry"]["organizationId"];
    posting: Posting;
    rate: VatRate;
    amount: bigint;
    percent: bigint;
    methods: VatMethods;
    systemAccounts: SystemAccountsByPurpose;
  }): VatPosting[] {
    const tax = divideAndRoundToNearest({
      value: amount * percent,
      divisor: RATE_SCALE_IN_PERCENT,
    });

    const regardsTax = systemAccounts[SystemAccountPurpose.REGARDS_TAX];

    if (isNullish(regardsTax)) {
      throw new JournalVatSystemAccountError(
        `Organization ${organizationId} has no ${SystemAccountPurpose.REGARDS_TAX} system account`,
      );
    }

    const taxAccountId =
      methods.paymentMethod === VatPaymentMethod.EFFECTIVE
        ? this.#inputTaxAccount({ rate, systemAccounts }).accountId
        : posting.accountId;

    return this.#toVatPostings({
      posting,
      tax,
      taxAccountId,
      counterAccountId: regardsTax.accountId,
      vatRateId: rate.id,
    });
  }

  #toVatPostings({
    posting,
    tax,
    taxAccountId,
    counterAccountId,
    vatRateId,
  }: {
    posting: Posting;
    tax: bigint;
    taxAccountId: Posting["accountId"];
    counterAccountId: Posting["accountId"];
    vatRateId: VatRate["id"];
  }): VatPosting[] {
    return tax > 0n
      ? [
          {
            accountId: taxAccountId,
            debit: posting.debit > 0n ? tax : 0n,
            credit: posting.credit > 0n ? tax : 0n,
            vatRateId,
          },
          {
            accountId: counterAccountId,
            debit: posting.credit > 0n ? tax : 0n,
            credit: posting.debit > 0n ? tax : 0n,
            vatRateId: null,
          },
        ]
      : [];
  }

  #vatTaxDueAccount({
    organizationId,
    systemAccounts,
  }: {
    organizationId: SelectJournal["entry"]["organizationId"];
    systemAccounts: SystemAccountsByPurpose;
  }): SystemAccount {
    const account = systemAccounts[SystemAccountPurpose.VAT_TAX_DUE];

    if (isNullish(account)) {
      throw new JournalVatSystemAccountError(
        `Organization ${organizationId} has no ${SystemAccountPurpose.VAT_TAX_DUE} system account`,
      );
    }

    return account;
  }

  #inputTaxAccount({
    rate,
    systemAccounts,
  }: {
    rate: VatRate;
    systemAccounts: SystemAccountsByPurpose;
  }): SystemAccount {
    const purpose =
      rate.type === VatType.INPUT_TAX_MATERIALS || rate.type === VatType.ACQUISITION_TAX_MATERIALS
        ? SystemAccountPurpose.TAX_PRE_MATERIAL
        : SystemAccountPurpose.TAX_PRE_INVESTMENT;

    const account = systemAccounts[purpose];

    if (isNullish(account)) {
      throw new JournalVatSystemAccountError(
        `Organization ${rate.organizationId} has no ${purpose} system account`,
      );
    }

    return account;
  }
}
