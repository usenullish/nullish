import type { Tx } from "@usenullish/nullish-db";
import {
  BALANCE_SHEET_ACCOUNT_TYPES,
  EXCHANGE_RATE_ONE,
  INCOME_STATEMENT_ACCOUNT_TYPES,
  PeriodJournalEntryType,
  SystemAccountPurpose,
} from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Composites } from "@usenullish/nullish-schema/composites";
import {
  isArrayAtLeastOne,
  isNullish,
  type Nullable,
  type Option,
} from "@usenullish/nullish-common";
import { EngineError } from "../../../errors";
import { getAccountingSetting } from "../../../core/_helpers/accounting-settings";
import { getSystemAccounts } from "../../_helpers/accounts-system";
import { insertJournal } from "../../_helpers/journal";
import { listPeriodBalances, type PeriodBalance } from "../../_helpers/period-balances";
import { insertPeriodJournalEntry } from "../../_helpers/period-journal";

type Period = Records["Ledger"]["Periods"]["Select"];
type Account = Records["Ledger"]["Accounts"]["Select"];
type SystemAccount = Records["Ledger"]["SystemAccounts"]["Select"];
type AccountingSettings = Records["Core"]["AccountingSettings"]["Select"];

type JournalInsert = Composites["Journal"]["Insert"];
type JournalInsertPosting = JournalInsert["postings"][number];

type SystemAccountsByPurpose = Record<SystemAccountPurpose, Option<SystemAccount>>;

export interface AccountBalance {
  accountId: Account["id"];
  balance: bigint;
}

export interface PeriodClosingArgs {
  organizationId: Period["organizationId"];
  period: Period;
  nextPeriod: Period;
}

class PeriodUndefinedSystemAccountError extends EngineError {}
class PeriodUnbalancedError extends EngineError {}

export abstract class PeriodClosing {
  readonly #organizationId: Period["organizationId"];
  readonly #periods: { result: Period; opening: Period };

  protected constructor({ organizationId, period, nextPeriod }: PeriodClosingArgs) {
    this.#organizationId = organizationId;
    this.#periods = { result: period, opening: nextPeriod };
  }

  protected abstract _buildTransfers(args: {
    balances: PeriodBalance[];
    systemAccounts: SystemAccountsByPurpose;
  }): Nullable<AccountBalance[]>;

  protected abstract _buildOpeningBalances(args: {
    closingBalances: AccountBalance[];
    systemAccounts: SystemAccountsByPurpose;
  }): AccountBalance[];

  async book({ tx }: { tx: Tx }): Promise<void> {
    // 1. Load all the system accounts - they will be used in several steps
    const systemAccounts = await getSystemAccounts({
      tx,
      organizationId: this.#organizationId,
    });

    // 2. The annual profit and result system accounts are common
    const annualSystemAccounts = this.#loadAnnualSystemAccounts({
      systemAccounts,
    });

    // 3. Load the account for the currency
    const { baseCurrency } = await getAccountingSetting({
      tx,
      organizationId: this.#organizationId,
    });

    // 4. List the result period balances
    const balances = await listPeriodBalances({ tx, ...this.#periods.result });

    // 5. Compute the result of the period
    const result = this.#computeResult({ balances });

    // 6. If applicable, prepare some postings that need to be transferred between accounts
    const postingsTransfers = this._buildTransfers({
      balances,
      systemAccounts,
    });

    // 7. Book the result period
    await this.#bookResult({
      tx,
      result,
      postingsTransfers,
      baseCurrency,
      ...annualSystemAccounts,
    });

    // 8. Book the postings on the opening period
    await this.#bookOpening({
      tx,
      balances,
      result,
      baseCurrency,
      systemAccounts,
      ...annualSystemAccounts,
    });
  }

  #loadAnnualSystemAccounts({ systemAccounts }: { systemAccounts: SystemAccountsByPurpose }): {
    annualProfit: SystemAccount;
    annualResult: SystemAccount;
  } {
    return {
      annualProfit: this._assertSystemAccount({
        systemAccounts,
        purpose: SystemAccountPurpose.ANNUAL_PROFIT,
      }),
      annualResult: this._assertSystemAccount({
        systemAccounts,
        purpose: SystemAccountPurpose.ANNUAL_RESULT,
      }),
    };
  }

  protected _assertSystemAccount = ({
    systemAccounts,
    purpose,
  }: {
    systemAccounts: SystemAccountsByPurpose;
    purpose: SystemAccountPurpose;
  }): SystemAccount => {
    const systemAccount: Option<SystemAccount> = systemAccounts[purpose];

    if (isNullish(systemAccount)) {
      throw new PeriodUndefinedSystemAccountError(
        `No ${purpose} system account defined for organization ${this.#organizationId}`,
      );
    }

    return systemAccount;
  };

  #computeResult({ balances }: { balances: PeriodBalance[] }): bigint {
    return balances
      .filter(({ type }) => INCOME_STATEMENT_ACCOUNT_TYPES.includes(type))
      .reduce((result, { debit, credit }) => result + credit - debit, 0n);
  }

  async #bookResult({
    tx,
    result,
    postingsTransfers,
    annualProfit,
    annualResult,
    baseCurrency,
  }: {
    tx: Tx;
    result: bigint;
    postingsTransfers: Nullable<AccountBalance[]>;
    annualProfit: SystemAccount;
    annualResult: SystemAccount;
    baseCurrency: AccountingSettings["baseCurrency"];
  }): Promise<void> {
    const postings = [
      ...(result === 0n
        ? []
        : this.#prepareResultPostings({
            result,
            annualProfit,
            annualResult,
            baseCurrency,
          })),
      ...(postingsTransfers ?? []).map(({ accountId, balance }) =>
        this.#preparePosting({
          accountId,
          baseCurrency,
          ...(balance > 0n ? { debit: balance } : { credit: -balance }),
        }),
      ),
    ];

    // Neither a profit, a loss nor an equity transfer: there is nothing to book.
    if (!isArrayAtLeastOne(postings)) {
      return;
    }

    const {
      entry: { id: journalEntryId },
    } = await insertJournal({
      tx,
      values: {
        entry: {
          organizationId: this.#organizationId,
          validOn: this.#periods.result.endOn,
          reference: null,
        },
        postings,
      },
    });

    await insertPeriodJournalEntry({
      tx,
      organizationId: this.#organizationId,
      periodId: this.#periods.result.id,
      journalEntryId,
      entryType: PeriodJournalEntryType.RESULT,
    });
  }

  #prepareResultPostings({
    result,
    annualProfit,
    annualResult,
    baseCurrency,
  }: {
    result: bigint;
    annualProfit: SystemAccount;
    annualResult: SystemAccount;
    baseCurrency: AccountingSettings["baseCurrency"];
  }): JournalInsert["postings"] {
    const profit = result > 0n;
    const amount = profit ? result : -result;

    return [
      this.#preparePosting({
        accountId: annualProfit.accountId,
        baseCurrency,
        ...(profit ? { debit: amount } : { credit: amount }),
      }),
      this.#preparePosting({
        accountId: annualResult.accountId,
        baseCurrency,
        ...(profit ? { credit: amount } : { debit: amount }),
      }),
    ];
  }

  async #bookOpening({
    tx,
    balances,
    result,
    annualResult,
    baseCurrency,
    systemAccounts,
  }: {
    tx: Tx;
    balances: PeriodBalance[];
    result: bigint;
    annualResult: SystemAccount;
    baseCurrency: AccountingSettings["baseCurrency"];
    systemAccounts: SystemAccountsByPurpose;
  }): Promise<void> {
    const openingPostings = this.#prepareOpeningPostings({
      balances,
      result,
      annualResult,
      baseCurrency,
      systemAccounts,
    });

    // No balance sheet account has a balance: there is nothing to carry over to the next period.
    if (!isArrayAtLeastOne(openingPostings)) {
      return;
    }

    const {
      entry: { id: journalEntryId },
    } = await insertJournal({
      tx,
      values: {
        entry: {
          organizationId: this.#organizationId,
          validOn: this.#periods.opening.startOn,
          reference: null,
        },
        postings: openingPostings,
      },
    });

    await insertPeriodJournalEntry({
      tx,
      organizationId: this.#organizationId,
      periodId: this.#periods.opening.id,
      journalEntryId,
      entryType: PeriodJournalEntryType.OPENING,
    });
  }

  #prepareOpeningPostings({
    balances,
    systemAccounts,
    result,
    annualResult,
    baseCurrency,
  }: {
    balances: PeriodBalance[];
    systemAccounts: SystemAccountsByPurpose;
    result: bigint;
    annualResult: SystemAccount;
    baseCurrency: AccountingSettings["baseCurrency"];
  }): JournalInsert["postings"] {
    const accountBalances: AccountBalance[] = balances
      .filter(({ type }) => BALANCE_SHEET_ACCOUNT_TYPES.includes(type))
      .map(({ accountId, debit, credit }) => ({
        accountId,
        balance: debit - credit,
      }));

    const resultAccountBalance = accountBalances.find(
      ({ accountId }) => accountId === annualResult.accountId,
    );

    const resultBalance: AccountBalance = {
      accountId: annualResult.accountId,
      balance: (resultAccountBalance?.balance ?? 0n) - result,
    };

    const closingBalances = [
      ...accountBalances.filter(({ accountId }) => accountId !== annualResult.accountId),
      resultBalance,
    ];

    const openingBalances = this._buildOpeningBalances({
      systemAccounts,
      closingBalances,
    }).filter(({ balance }) => balance !== 0n);

    const total = openingBalances.reduce((total, { balance }) => total + balance, 0n);

    if (total !== 0n) {
      throw new PeriodUnbalancedError(
        `The balance sheet of period ${this.#periods.result.id} does not balance: the closing accounts carry a balance of ${-total}`,
      );
    }

    return openingBalances.map(({ accountId, balance }) =>
      this.#preparePosting({
        accountId,
        baseCurrency,
        ...(balance > 0n ? { debit: balance } : { credit: -balance }),
      }),
    );
  }

  #preparePosting({
    accountId,
    baseCurrency,
    ...amount
  }: {
    accountId: Account["id"];
    baseCurrency: AccountingSettings["baseCurrency"];
  } & ({ debit: bigint } | { credit: bigint })): JournalInsertPosting {
    return {
      accountId,
      description: null,
      debit: "debit" in amount ? amount.debit : 0n,
      credit: "credit" in amount ? amount.credit : 0n,
      currency: baseCurrency,
      exchangeRate: EXCHANGE_RATE_ONE,
      vatRateId: null,
    };
  }
}
