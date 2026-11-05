import type { Tx } from "@usenullish/nullish-db";
import { MigrationContext, type MigrationContextArgs } from "../_context";
import {
  createTokenSchema,
  isArrayAtLeastOne,
  isArrayEmpty,
  isNullish,
  nonNullish,
  toLocalDateString,
} from "@usenullish/nullish-common";
import {
  AccountType,
  EXCHANGE_RATE_ONE,
  SystemAccountPurpose,
} from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Migration } from "@usenullish/nullish-schema/migration";
import { listAccountsByOrgId, listSystemAccountsByOrgId } from "../_helpers/accounts";
import { type BaseCurrency, getBaseCurrencyByOrgId } from "../_helpers/currencies";
import { createJournal, type OpeningPosting } from "../_helpers/journal";
import { getOpenPeriod } from "../_helpers/periods";

type Account = Records["Ledger"]["Accounts"]["Select"];
type JournalEntry = Records["Ledger"]["JournalEntries"]["Select"];

type ForeignBalances = Migration["Foreign"]["Balances"];

export class MigrateBalancesDuplicateError extends Error {}
export class MigrateBalancesNoPeriodError extends Error {}
export class MigrateBalancesNoAccountingSettingsError extends Error {}
export class MigrateBalancesNoOpeningAccountError extends Error {}
export class MigrateBalancesUnknownAccountsError extends Error {}
export class MigrateBalancesEmptyError extends Error {}
export class MigrateBalancesUnbalancedError extends Error {}

export class MigrateBalancesService extends MigrationContext {
  private constructor(args: MigrationContextArgs) {
    super(args);
  }

  static create(args: MigrationContextArgs): MigrateBalancesService {
    return new this(args);
  }

  async migrate({
    tx,
    balances,
    validOn,
  }: {
    tx: Tx;
    balances: ForeignBalances;
    validOn: JournalEntry["validOn"];
  }): Promise<void> {
    // TODO: also use in an assertion step
    assertNoDuplicateBalances({ balances });

    const period = await getOpenPeriod({ tx, organizationId: this._organizationId, validOn });

    if (period.status === "error") {
      throw new MigrateBalancesNoPeriodError(
        `No accounting period covering ${toLocalDateString(validOn)}. Open one or pick another date.`,
      );
    }

    const accounts = await listAccountsByOrgId({ tx, organizationId: this._organizationId });

    if (accounts.status === "error") {
      throw accounts.err;
    }

    const systemAccounts = await listSystemAccountsByOrgId({
      tx,
      organizationId: this._organizationId,
    });

    if (systemAccounts.status === "error") {
      throw systemAccounts.err;
    }

    const baseCurrency = await getBaseCurrencyByOrgId({
      tx,
      organizationId: this._organizationId,
    });

    if (baseCurrency.status === "error") {
      throw baseCurrency.err;
    }

    if (isNullish(baseCurrency.result)) {
      throw new MigrateBalancesNoAccountingSettingsError(
        "The organization has no accounting settings.",
      );
    }

    const openingSystemAccount = systemAccounts.result.find(
      ({ purpose }) => purpose === SystemAccountPurpose.OPENING_BALANCE_SHEET,
    );

    if (isNullish(openingSystemAccount)) {
      throw new MigrateBalancesNoOpeningAccountError(
        "No account is bound to the opening balance sheet purpose (e.g. 9100).",
      );
    }

    const postings = buildBalancesPostings({
      balances,
      accounts: accounts.result,
      baseCurrency: baseCurrency.result,
    });

    if (!isArrayAtLeastOne(postings)) {
      throw new MigrateBalancesEmptyError("No opening balances to import.");
    }

    assertBalancesPostingsTotal({ postings });

    const created = await createJournal({
      tx,
      organizationId: this._organizationId,
      validOn,
      reference: null,
      migrated: true,
      postings,
    });

    if (created.status === "error") {
      throw created.err;
    }
  }
}

const assertNoDuplicateBalances = ({ balances }: { balances: ForeignBalances }) => {
  const counts = balances.reduce<Map<string, number>>((acc, { code }) => {
    acc.set(code, (acc.get(code) ?? 0) + 1);
    return acc;
  }, new Map());

  const duplicates = [...counts].filter(([, count]) => count > 1).map(([code]) => code);

  if (!isArrayEmpty(duplicates)) {
    throw new MigrateBalancesDuplicateError(
      `The balance sheet contains duplicate accounts: ${duplicates.join(", ")}`,
    );
  }
};

const assertBalancesPostingsTotal = ({ postings }: { postings: OpeningPosting[] }) => {
  const [totalDebit, totalCredit] = postings.reduce(
    ([totalDebit, totalCredit], { debit, credit }) => [totalDebit + debit, totalCredit + credit],
    [0n, 0n],
  );

  const diff = totalDebit - totalCredit;

  if (diff !== 0n) {
    throw new MigrateBalancesUnbalancedError(
      `Unbalanced opening balance export! Total Debit (${totalDebit}) does not equal Total Credit (${totalCredit}). Difference: ${diff}`,
    );
  }
};

const buildBalancesPostings = ({
  balances,
  accounts,
  baseCurrency,
}: {
  balances: ForeignBalances;
  accounts: Account[];
  baseCurrency: BaseCurrency;
}): OpeningPosting[] => {
  const accountByCode = new Map<Account["code"], Account>(
    accounts.map((account) => [account.code, account]),
  );

  const unknownAccounts = balances.filter(({ code }) => !accountByCode.has(code));

  if (isArrayAtLeastOne(unknownAccounts)) {
    throw new MigrateBalancesUnknownAccountsError(
      `The opening balances reference unknown accounts: ${unknownAccounts
        .map(({ code }) => code)
        .join(", ")}. Add the chart of accounts to the migration or create them.`,
    );
  }

  const parentIds = new Set<Account["id"]>(
    accounts.map((account) => account.parentId).filter(nonNullish),
  );

  const OpeningPostingApplication: Record<AccountType, "debit" | "credit" | null> = {
    [AccountType.ASSET]: "debit",
    [AccountType.LIABILITY]: "credit",
    [AccountType.EQUITY]: "credit",
    [AccountType.EXPENSE]: null,
    [AccountType.INCOME]: null,
    [AccountType.CLOSING]: null,
  };

  const tokenSchema = createTokenSchema({
    decimals: baseCurrency.decimals,
  });

  return balances.reduce<OpeningPosting[]>((acc, { code, amount }) => {
    const account = accountByCode.get(code);

    // TS safe guard. Above unknownAccounts check prevents it.
    if (isNullish(account)) {
      return acc;
    }

    const isParent = parentIds.has(account.id);

    // Amount of account e.g. 1, 10 or, 100 should not create postings
    if (isParent) {
      return acc;
    }

    const application = OpeningPostingApplication[account.type];

    // Closing amount should not be present
    if (isNullish(application)) {
      return acc;
    }

    const value = tokenSchema.parse(`${amount}`);

    // We do not create empty entries
    if (value === 0n) {
      return acc;
    }

    return [
      ...acc,
      {
        accountId: account.id,
        // TODO: description should be come optional or use standard code
        description: account.name ?? account.code,
        debit:
          application === "debit" && value > 0n
            ? value
            : application === "credit" && value > 0n
              ? value
              : 0n,
        credit:
          application === "credit" && value < 0n
            ? -1n * value
            : application === "debit" && value < 0n
              ? -1n * value
              : 0n,
        currency: baseCurrency.code,
        exchangeRate: EXCHANGE_RATE_ONE,
        vatRateId: null,
      },
    ];
  }, []);
};
