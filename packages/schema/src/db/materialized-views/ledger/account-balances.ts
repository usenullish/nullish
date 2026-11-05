import { sql, eq, and, between } from "drizzle-orm";
import * as pg from "drizzle-orm/pg-core";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import {
  AccountingSettingsSchema,
  AccountsSchema,
  CurrenciesSchema,
  currencyValue,
  JournalEntriesSchema,
  LedgerSchema,
  PeriodsSchema,
  PostingsSchema,
} from "../../schemas";
import { AccountType } from "../../constants/accounts";
import { castCurrencyValue, convertToBaseCurrency } from "../../_sql";

const queryBuilder = new QueryBuilder();

const BaseCurrenciesSchema = alias(CurrenciesSchema, "base_currencies");

const accountClosureSql = sql`
  account_closure AS (
    -- Base case: Every account maps to itself
    SELECT
      ${AccountsSchema.id} AS account_id,
      ${AccountsSchema.id} AS ancestor_id,
      ${AccountsSchema.organizationId} AS organization_id
    FROM ${AccountsSchema}

    UNION ALL

  -- Recursive step: Step up the tree using parent_id
    SELECT
      child.account_id,
      curr."parent_id" AS ancestor_id,
      child.organization_id
    FROM account_closure child
    JOIN ${AccountsSchema} curr ON curr."id" = child.ancestor_id
    WHERE curr."parent_id" IS NOT NULL
  )
`;

// Each posting with the period its journal entry is dated in
const postingPeriodsCte = queryBuilder
  .select({
    account_id: PostingsSchema.accountId,
    period_id: PeriodsSchema.id.as("period_id"),
    debit: PostingsSchema.debit,
    credit: PostingsSchema.credit,
    exchange_rate: PostingsSchema.exchangeRate,
    decimals_shift: sql<number>`${BaseCurrenciesSchema.decimals} - ${CurrenciesSchema.decimals}`.as(
      "decimals_shift",
    ),
  })
  .from(PostingsSchema)
  .innerJoin(JournalEntriesSchema, eq(JournalEntriesSchema.id, PostingsSchema.journalEntryId))
  .innerJoin(CurrenciesSchema, eq(CurrenciesSchema.code, PostingsSchema.currency))
  .innerJoin(
    AccountingSettingsSchema,
    eq(AccountingSettingsSchema.organizationId, JournalEntriesSchema.organizationId),
  )
  .innerJoin(
    BaseCurrenciesSchema,
    eq(BaseCurrenciesSchema.code, AccountingSettingsSchema.baseCurrency),
  )
  .innerJoin(
    PeriodsSchema,
    and(
      eq(PeriodsSchema.organizationId, JournalEntriesSchema.organizationId),
      between(JournalEntriesSchema.validOn, PeriodsSchema.startOn, PeriodsSchema.endOn),
    ),
  );

const baseCurrencyDebitSql = sql`COALESCE(SUM(${convertToBaseCurrency({ amount: sql`posting_periods.debit`, exchangeRate: sql`posting_periods.exchange_rate`, decimalsShift: sql`posting_periods.decimals_shift` })}), 0)`;
const baseCurrencyCreditSql = sql`COALESCE(SUM(${convertToBaseCurrency({ amount: sql`posting_periods.credit`, exchangeRate: sql`posting_periods.exchange_rate`, decimalsShift: sql`posting_periods.decimals_shift` })}), 0)`;

const accountBalancesCte = queryBuilder
  .select({
    organization_id: AccountsSchema.organizationId,
    period_id: PeriodsSchema.id.as("period_id"),
    account_id: AccountsSchema.id.as("account_id"),
    parent_id: AccountsSchema.parentId,
    code: AccountsSchema.code,
    name: AccountsSchema.name,
    type: AccountsSchema.type,
    total_debit: castCurrencyValue(baseCurrencyDebitSql).as("total_debit"),
    total_credit: castCurrencyValue(baseCurrencyCreditSql).as("total_credit"),
    balance: castCurrencyValue(sql`
      CASE
            WHEN ${AccountsSchema.type} = ${AccountType.ASSET} OR ${AccountsSchema.type} = ${AccountType.EXPENSE}
      THEN ${baseCurrencyDebitSql} - ${baseCurrencyCreditSql}
      ELSE
      ${baseCurrencyCreditSql} - ${baseCurrencyDebitSql}
      END
    `).as("balance"),
    computed_at: sql<Date>`now()`.as("computed_at"),
  })
  .from(AccountsSchema)
  .innerJoin(PeriodsSchema, eq(PeriodsSchema.organizationId, AccountsSchema.organizationId))
  .leftJoin(
    sql`account_closure`,
    and(
      eq(sql`account_closure.ancestor_id`, AccountsSchema.id),
      eq(sql`account_closure.organization_id`, AccountsSchema.organizationId),
    ),
  )
  .leftJoin(
    sql`posting_periods`,
    and(
      eq(sql`posting_periods.account_id`, sql`account_closure.account_id`),
      eq(sql`posting_periods.period_id`, PeriodsSchema.id),
    ),
  )
  .groupBy(
    AccountsSchema.organizationId,
    AccountsSchema.id,
    AccountsSchema.parentId,
    AccountsSchema.code,
    AccountsSchema.name,
    AccountsSchema.type,
    PeriodsSchema.id,
  )
  .having(sql`${baseCurrencyDebitSql} != 0 OR ${baseCurrencyCreditSql} != 0`);

const finalQuery = sql`
  WITH RECURSIVE ${accountClosureSql}, posting_periods AS (${postingPeriodsCte}), account_balances_cte AS (${accountBalancesCte})
  SELECT * FROM account_balances_cte
`;

export const AccountBalancesMaterializedView = LedgerSchema.materializedView(
  "mv_account_balances",
  {
    organizationId: pg.uuid(),
    periodId: pg.uuid(),
    accountId: pg.uuid(),
    parentId: pg.uuid(),
    code: pg.text(),
    name: pg.text(),
    type: pg.text(),
    totalDebit: currencyValue().notNull(),
    totalCredit: currencyValue().notNull(),
    balance: currencyValue().notNull(),
    computedAt: pg.timestamp({ withTimezone: true }).notNull(),
  },
).as(finalQuery);
