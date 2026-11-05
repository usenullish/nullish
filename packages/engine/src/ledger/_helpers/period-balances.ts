import type { Tx } from "@usenullish/nullish-db";
import { castCurrencyValue, convertToBaseCurrency, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { and, eq, gte, lte, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import * as z from "zod";

type SelectPeriod = Records["Ledger"]["Periods"]["Select"];

const PeriodBalanceSchema = z.strictObject({
  accountId: RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema.shape.id,
  type: RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema.shape.type,
  debit: z.coerce.bigint(),
  credit: z.coerce.bigint(),
});

const PeriodBalancesSchema = z.array(PeriodBalanceSchema);

export type PeriodBalance = z.infer<typeof PeriodBalanceSchema>;

const BaseCurrenciesSchema = alias(DbSchema.Core.Currencies.CurrenciesSchema, "base_currencies");

const baseCurrencyTotalSql = (amount: SQLWrapper): SQL =>
  sql`COALESCE(SUM(${convertToBaseCurrency({
    amount,
    exchangeRate: DbSchema.Ledger.Journal.PostingsSchema.exchangeRate,
    decimalsShift: sql`${BaseCurrenciesSchema.decimals} - ${DbSchema.Core.Currencies.CurrenciesSchema.decimals}`,
  })}), 0)`;

// TODO: refactor to share code with materialized view?
export const listPeriodBalances = async ({
  tx,
  organizationId,
  startOn,
  endOn,
}: { tx: Tx } & Pick<SelectPeriod, "organizationId" | "startOn" | "endOn">): Promise<
  PeriodBalance[]
> => {
  const balances = await tx
    .select({
      accountId: DbSchema.Ledger.Accounts.AccountsSchema.id,
      type: DbSchema.Ledger.Accounts.AccountsSchema.type,
      debit: castCurrencyValue(
        baseCurrencyTotalSql(DbSchema.Ledger.Journal.PostingsSchema.debit),
      ).as("debit"),
      credit: castCurrencyValue(
        baseCurrencyTotalSql(DbSchema.Ledger.Journal.PostingsSchema.credit),
      ).as("credit"),
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
    .where(
      and(
        eq(DbSchema.Ledger.Journal.JournalEntriesSchema.organizationId, organizationId),
        gte(DbSchema.Ledger.Journal.JournalEntriesSchema.validOn, startOn),
        lte(DbSchema.Ledger.Journal.JournalEntriesSchema.validOn, endOn),
      ),
    )
    .groupBy(
      DbSchema.Ledger.Accounts.AccountsSchema.id,
      DbSchema.Ledger.Accounts.AccountsSchema.type,
    );

  return PeriodBalancesSchema.parse(balances);
};
