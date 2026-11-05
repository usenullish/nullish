import type { Tx } from "@usenullish/nullish-db";
import { isNullish, nonNullish, notEmptyString, type Option } from "@usenullish/nullish-common";
import {
  AccountType,
  castCurrencyValue,
  convertToBaseCurrency,
  DbSchema,
  type QueryArgs,
} from "@usenullish/nullish-schema/db";
import { type Reports, ReportsSchema } from "@usenullish/nullish-schema/reports";
import type { Records } from "@usenullish/nullish-schema/records";
import {
  and,
  asc,
  between,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ilikeContains } from "../../_query/helpers";

type OrganizationId = Records["Core"]["Organizations"]["Select"]["id"];
type FilterAccountLedger = Reports["Ledger"]["AccountLedger"]["Filter"];
type AccountLedgerSortField = Reports["Ledger"]["AccountLedger"]["SortField"];

const periodPostingsJoin = and(
  eq(
    DbSchema.Ledger.Periods.PeriodsSchema.organizationId,
    DbSchema.Ledger.Journal.JournalEntriesSchema.organizationId,
  ),
  between(
    DbSchema.Ledger.Journal.JournalEntriesSchema.validOn,
    DbSchema.Ledger.Periods.PeriodsSchema.startOn,
    DbSchema.Ledger.Periods.PeriodsSchema.endOn,
  ),
);

const BaseCurrenciesSchema = alias(DbSchema.Core.Currencies.CurrenciesSchema, "base_currencies");

const baseCurrencyAmountSql = (amount: SQLWrapper): SQL =>
  convertToBaseCurrency({
    amount,
    exchangeRate: DbSchema.Ledger.Journal.PostingsSchema.exchangeRate,
    decimalsShift: sql`${BaseCurrenciesSchema.decimals} - ${DbSchema.Core.Currencies.CurrenciesSchema.decimals}`,
  });

const baseDebitSql = baseCurrencyAmountSql(DbSchema.Ledger.Journal.PostingsSchema.debit);
const baseCreditSql = baseCurrencyAmountSql(DbSchema.Ledger.Journal.PostingsSchema.credit);

const movementSql = sql`CASE WHEN ${inArray(DbSchema.Ledger.Accounts.AccountsSchema.type, [AccountType.ASSET, AccountType.EXPENSE])} THEN ${baseDebitSql} - ${baseCreditSql} ELSE ${baseCreditSql} - ${baseDebitSql} END`;

const postingOrder = [
  asc(DbSchema.Ledger.Journal.JournalEntriesSchema.validOn),
  asc(DbSchema.Ledger.Journal.JournalEntriesSchema.number),
  asc(DbSchema.Ledger.Journal.PostingsSchema.createdAt),
  asc(DbSchema.Ledger.Journal.PostingsSchema.id),
];

type AccountLedgerArgs = {
  tx: Tx;
  organizationId: OrganizationId;
} & Reports["Ledger"]["AccountLedger"]["Args"];

const accountLedgerSubquery = ({ tx, organizationId, periodId, accountId }: AccountLedgerArgs) =>
  tx
    .select({
      postingId: sql<
        Records["Ledger"]["Postings"]["Select"]["id"]
      >`${DbSchema.Ledger.Journal.PostingsSchema.id}`.as("posting_id"),
      journalEntryId: sql<
        Records["Ledger"]["JournalEntries"]["Select"]["id"]
      >`${DbSchema.Ledger.Journal.JournalEntriesSchema.id}`.as("journal_entry_id"),
      number: DbSchema.Ledger.Journal.JournalEntriesSchema.number,
      validOn: DbSchema.Ledger.Journal.JournalEntriesSchema.validOn,
      reference: DbSchema.Ledger.Journal.JournalEntriesSchema.reference,
      description: DbSchema.Ledger.Journal.PostingsSchema.description,
      currency: DbSchema.Ledger.Journal.PostingsSchema.currency,
      debit: DbSchema.Ledger.Journal.PostingsSchema.debit,
      credit: DbSchema.Ledger.Journal.PostingsSchema.credit,
      baseDebit: castCurrencyValue(baseDebitSql).as("base_debit"),
      baseCredit: castCurrencyValue(baseCreditSql).as("base_credit"),
      balance: castCurrencyValue(
        sql`SUM(${movementSql}) OVER (ORDER BY ${sql.join(postingOrder, sql`, `)})`,
      ).as("balance"),
      position: sql<number>`ROW_NUMBER() OVER (ORDER BY ${sql.join(postingOrder, sql`, `)})`.as(
        "position",
      ),
    })
    .from(DbSchema.Ledger.Journal.PostingsSchema)
    .innerJoin(
      DbSchema.Ledger.Journal.JournalEntriesSchema,
      eq(
        DbSchema.Ledger.Journal.PostingsSchema.journalEntryId,
        DbSchema.Ledger.Journal.JournalEntriesSchema.id,
      ),
    )
    .innerJoin(
      DbSchema.Ledger.Accounts.AccountsSchema,
      eq(
        DbSchema.Ledger.Accounts.AccountsSchema.id,
        DbSchema.Ledger.Journal.PostingsSchema.accountId,
      ),
    )
    .innerJoin(
      DbSchema.Core.Currencies.CurrenciesSchema,
      eq(
        DbSchema.Core.Currencies.CurrenciesSchema.code,
        DbSchema.Ledger.Journal.PostingsSchema.currency,
      ),
    )
    .innerJoin(
      DbSchema.Core.Accounting.AccountingSettingsSchema,
      eq(
        DbSchema.Core.Accounting.AccountingSettingsSchema.organizationId,
        DbSchema.Ledger.Journal.JournalEntriesSchema.organizationId,
      ),
    )
    .innerJoin(
      BaseCurrenciesSchema,
      eq(BaseCurrenciesSchema.code, DbSchema.Core.Accounting.AccountingSettingsSchema.baseCurrency),
    )
    .innerJoin(DbSchema.Ledger.Periods.PeriodsSchema, periodPostingsJoin)
    .where(
      and(
        eq(DbSchema.Ledger.Journal.JournalEntriesSchema.organizationId, organizationId),
        eq(DbSchema.Ledger.Periods.PeriodsSchema.id, periodId),
        eq(DbSchema.Ledger.Journal.PostingsSchema.accountId, accountId),
      ),
    )
    .as("account_ledger");

type AccountLedgerSubquery = ReturnType<typeof accountLedgerSubquery>;

const accountLedgerWhere = ({
  ledger,
  filters,
}: {
  ledger: AccountLedgerSubquery;
  filters: Option<FilterAccountLedger>;
}): Option<SQL> =>
  isNullish(filters)
    ? undefined
    : and(
        nonNullish(filters.number) ? eq(ledger.number, filters.number) : undefined,
        nonNullish(filters.validOnFrom) ? gte(ledger.validOn, filters.validOnFrom) : undefined,
        nonNullish(filters.validOnTo) ? lte(ledger.validOn, filters.validOnTo) : undefined,
        notEmptyString(filters.reference)
          ? ilikeContains({ column: ledger.reference, value: filters.reference })
          : undefined,
      );

export const listAccountLedger = async ({
  filters,
  pagination: { limit, offset },
  sort: { field, direction: sortDirection },
  ...args
}: AccountLedgerArgs & {
  filters: Option<FilterAccountLedger>;
} & QueryArgs<AccountLedgerSortField>): Promise<Reports["Ledger"]["AccountLedger"]["Result"]> => {
  const ledger = accountLedgerSubquery(args);

  const direction = sortDirection === "asc" ? asc : desc;

  const rows = await args.tx
    .select()
    .from(ledger)
    .where(accountLedgerWhere({ ledger, filters }))
    .orderBy(direction(ledger[field]), direction(ledger.position))
    .limit(limit)
    .offset(offset);

  return ReportsSchema.LedgerSchema.AccountLedgerSchema.parse(
    rows.map(({ position: _, ...posting }) => posting),
  );
};

export const totalAccountLedger = async ({
  filters,
  ...args
}: AccountLedgerArgs & {
  filters: Option<FilterAccountLedger>;
}): Promise<Reports["Ledger"]["AccountLedger"]["Totals"]> => {
  const ledger = accountLedgerSubquery(args);

  const [totals] = await args.tx
    .select({
      baseDebit: castCurrencyValue(sql`COALESCE(SUM(${ledger.baseDebit}), 0)`),
      baseCredit: castCurrencyValue(sql`COALESCE(SUM(${ledger.baseCredit}), 0)`),
      balance: castCurrencyValue(
        sql`(ARRAY_AGG(${ledger.balance} ORDER BY ${ledger.position} DESC))[1]`,
      ),
    })
    .from(ledger)
    .where(accountLedgerWhere({ ledger, filters }));

  return ReportsSchema.LedgerSchema.AccountLedgerTotalsSchema.parse(totals);
};
