import type { Tx } from "@usenullish/nullish-db";
import { MigrationContext, type MigrationContextArgs } from "../_context";
import {
  assertNonNullish,
  createTokenSchema,
  isArrayAtLeastOne,
  isNullish,
  nonNullish,
  notEmptyString,
} from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";
import { VatType } from "@usenullish/nullish-schema/db";
import type { Migration } from "@usenullish/nullish-schema/migration";
import { listAccountsByOrgId } from "../_helpers/accounts";
import { listCurrencies } from "../_helpers/currencies";
import { createJournal, type OpeningPosting } from "../_helpers/journal";
import { listVatRatesByOrgId } from "../_helpers/vat";

type Account = Records["Ledger"]["Accounts"]["Select"];
type JournalEntry = Records["Ledger"]["JournalEntries"]["Select"];
type Currency = Records["Core"]["Currencies"]["Select"];
type VatRate = Records["Core"]["VatRates"]["Select"];

type CurrenciesByCode = Map<Currency["code"], Currency>;

type ForeignJournal = Migration["Foreign"]["Journal"];
type ForeignJournalLine = Migration["Foreign"]["JournalLine"];

interface JournalEntryToCreate {
  validOn: JournalEntry["validOn"];
  reference: JournalEntry["reference"];
  postings: [OpeningPosting, ...OpeningPosting[]];
}

export class MigrateJournalUnknownAccountsError extends Error {}
export class MigrateJournalUnknownCurrenciesError extends Error {}
export class MigrateJournalUnknownVatError extends Error {}
export class MigrateJournalDuplicateVatError extends Error {}

export class MigrateJournalService extends MigrationContext {
  private constructor(args: MigrationContextArgs) {
    super(args);
  }

  static create(args: MigrationContextArgs): MigrateJournalService {
    return new this(args);
  }

  async migrate({ tx, journal }: { tx: Tx; journal: ForeignJournal }): Promise<void> {
    const accounts = await listAccountsByOrgId({ tx, organizationId: this._organizationId });

    if (accounts.status === "error") {
      throw accounts.err;
    }

    const currencies = await listCurrencies({ tx });

    if (currencies.status === "error") {
      throw currencies.err;
    }

    const vatRates = await listVatRatesByOrgId({ tx, organizationId: this._organizationId });

    if (vatRates.status === "error") {
      throw vatRates.err;
    }

    const currenciesByCode: CurrenciesByCode = new Map(
      currencies.result.map((currency) => [currency.code, currency]),
    );

    assertJournalEntriesAccounts({ journal, accounts: accounts.result });
    assertJournalEntriesCurrencies({ journal, currenciesByCode });
    assertJournalEntriesVat({ journal, vatRates: vatRates.result });

    const entries = buildJournalEntries({
      journal,
      accounts: accounts.result,
      currenciesByCode,
      vatRates: vatRates.result,
    });

    for (const { validOn, reference, postings } of entries) {
      const created = await createJournal({
        tx,
        organizationId: this._organizationId,
        validOn,
        reference,
        migrated: true,
        postings,
      });

      if (created.status === "error") {
        throw created.err;
      }
    }
  }
}

const assertJournalEntriesAccounts = ({
  journal,
  accounts,
}: {
  journal: ForeignJournal;
  accounts: Account[];
}) => {
  const accountByCode = new Map<Account["code"], Account>(
    accounts.map((account) => [account.code, account]),
  );

  const uniqueCodes = journal.reduce<
    Set<ForeignJournalLine["codes"]["debit"] | ForeignJournalLine["codes"]["credit"]>
  >((acc, { lines }) => {
    const debits = lines.flatMap(({ codes: { debit } }) => debit);
    const credits = lines.flatMap(({ codes: { credit } }) => credit);

    return new Set([...acc, ...debits, ...credits]);
  }, new Set());

  const unknownCodes = [...uniqueCodes].filter((code) => isNullish(accountByCode.get(code)));

  if (unknownCodes.length > 0) {
    throw new MigrateJournalUnknownAccountsError(
      `The journal references unknown accounts: ${unknownCodes.join(", ")}. Add the chart of accounts to the migration or create them.`,
    );
  }
};

const assertJournalEntriesCurrencies = ({
  journal,
  currenciesByCode,
}: {
  journal: ForeignJournal;
  currenciesByCode: CurrenciesByCode;
}) => {
  const uniqueCurrencies = new Set(
    journal.flatMap(({ lines }) => lines.map(({ currency }) => currency)),
  );

  const unknownCurrencies = [...uniqueCurrencies].filter(
    (currency) => !currenciesByCode.has(currency),
  );

  if (unknownCurrencies.length > 0) {
    throw new MigrateJournalUnknownCurrenciesError(
      `The journal references unknown currencies: ${unknownCurrencies.join(", ")}`,
    );
  }
};

// Bexio packs the vat code together with extra reference and rate info in one free-text
// cell (e.g. "UN81(SSS1/68) (6.80%)"), so a exact match is not possible. Instead we look
// for the organization's vat rates whose code starts the cell and, when the cell ends with a
// rate, whose rate is that one (the net rate for the net rate tax).
//
// For example, say the user has defined a code "UN81" for the organization as net rate tax at
// 6.20%. If the migration data contains a cell "UN81(SSS1/68) (6.80%)", matching on the code
// would book the posting at 6.20% incorrectly.
const VAT_CELL_RATE = /\((\d+(?:\.\d+)?)%\)\s*$/;

const matchingVatRates = ({ vat, vatRates }: { vat: string; vatRates: VatRate[] }): VatRate[] => {
  const cellRate = VAT_CELL_RATE.exec(vat)?.[1];

  return vatRates.filter(
    ({ code, type, rate, netRate }) =>
      vat.startsWith(code) &&
      (isNullish(cellRate) ||
        Number(cellRate) === (type === VatType.NET_RATE_TAX ? netRate : rate)),
  );
};

const assertJournalEntriesVat = ({
  journal,
  vatRates,
}: {
  journal: ForeignJournal;
  vatRates: VatRate[];
}) => {
  const uniqueVat = new Set(
    journal.flatMap(({ lines }) => lines.map(({ vat }) => vat).filter(notEmptyString)),
  );

  const { duplicates, unknown } = [...uniqueVat].reduce<{
    duplicates: string[];
    unknown: string[];
  }>(
    ({ duplicates, unknown }, vat) => {
      const matches = matchingVatRates({ vat, vatRates });

      switch (matches.length) {
        case 0:
          return { duplicates, unknown: [...unknown, vat] };
        case 1:
          return { duplicates, unknown };
        default:
          return { duplicates: [...duplicates, vat], unknown };
      }
    },
    { duplicates: [], unknown: [] },
  );

  if (unknown.length > 0) {
    throw new MigrateJournalUnknownVatError(
      `The journal references unresolvable VAT codes: ${unknown.join(", ")}`,
    );
  }

  if (duplicates.length > 0) {
    throw new MigrateJournalDuplicateVatError(
      `The journal references duplicate VAT codes: ${duplicates.join(", ")}`,
    );
  }
};

// TODO: invoice payments booked by Bexio without the debtor (Bank / Revenue) only debit an asset account
// and are therefore not counted by the VAT declaration with the received method. Normalize them through
// the debtor (Bank / Debtor + Debtor / Revenue) like the payments booked by the app.
const buildJournalEntries = ({
  journal,
  accounts,
  currenciesByCode,
  vatRates,
}: {
  journal: ForeignJournal;
  accounts: Account[];
  currenciesByCode: CurrenciesByCode;
  vatRates: VatRate[];
}): JournalEntryToCreate[] => {
  const accountByCode = new Map<Account["code"], Account>(
    accounts.map((account) => [account.code, account]),
  );

  return journal.reduce<JournalEntryToCreate[]>((acc, { reference, validOn, lines }) => {
    const postings = lines
      .filter(({ amount }) => amount !== 0)
      .flatMap<OpeningPosting>(
        ({
          codes: { debit, credit },
          amount,
          currency: sourceCurrency,
          exchangeRate,
          description,
          vat,
        }) => {
          const isNegative = amount < 0;
          const debitAccount = accountByCode.get(isNegative ? credit : debit);
          const creditAccount = accountByCode.get(isNegative ? debit : credit);

          const currency = currenciesByCode.get(sourceCurrency);
          // TS. Known currencies asserted previously
          assertNonNullish(currency);

          const tokenSchema = createTokenSchema({
            decimals: currency.decimals,
          });
          const value = tokenSchema.parse(`${Math.abs(amount)}`);

          // TS. Resolved to exactly one match, or none, by assertJournalEntriesVat
          const vatRateId = notEmptyString(vat)
            ? (matchingVatRates({ vat, vatRates }).at(0)?.id ?? null)
            : null;

          const common = {
            description: description ?? reference,
            currency: currency.code,
            exchangeRate,
            vatRateId,
          };

          return [
            ...(nonNullish(debitAccount)
              ? [
                  {
                    ...common,
                    accountId: debitAccount.id,
                    debit: value,
                    credit: 0n,
                  },
                ]
              : []),
            ...(nonNullish(creditAccount)
              ? [
                  {
                    ...common,
                    accountId: creditAccount.id,
                    debit: 0n,
                    credit: value,
                  },
                ]
              : []),
          ];
        },
      );

    if (!isArrayAtLeastOne(postings)) {
      return acc;
    }

    return [...acc, { validOn, reference, postings }];
  }, []);
};
