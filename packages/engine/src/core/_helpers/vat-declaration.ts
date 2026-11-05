import type { Tx } from "@usenullish/nullish-db";
import {
  AccountType,
  castCurrencyValue,
  DbSchema,
  InvoiceJournalEntryType,
  SystemAccountPurpose,
  convertToBaseCurrency,
  VatRemunerationMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import {
  eq,
  sql,
  and,
  exists,
  gte,
  inArray,
  lte,
  not,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
import { alias, type PgAsyncSelect } from "drizzle-orm/pg-core";
import * as z from "zod";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

type OrganizationId = Records["Core"]["Organizations"]["Select"]["id"];

const PostingsByVatResultSchema = z.strictObject({
  type: RecordsSchema.Core.VatSchema.SelectVatRatesSchema.shape.type,
  rate: RecordsSchema.Core.VatSchema.SelectVatRatesSchema.shape.rate,
  netRate: RecordsSchema.Core.VatSchema.SelectVatRatesSchema.shape.netRate,
  startOn: RecordsSchema.Core.VatSchema.SelectVatRatesSchema.shape.startOn,
  endOn: RecordsSchema.Core.VatSchema.SelectVatRatesSchema.shape.endOn,
  totalDebit: z.coerce.bigint(),
  totalCredit: z.coerce.bigint(),
});

const PostingsByVatResultsSchema = z.array(PostingsByVatResultSchema);

const BaseCurrenciesSchema = alias(DbSchema.Core.Currencies.CurrenciesSchema, "base_currencies");

const decimalsShiftSql = sql`${BaseCurrenciesSchema.decimals} - ${DbSchema.Core.Currencies.CurrenciesSchema.decimals}`;

const baseCurrencyAmountSql = (amount: SQLWrapper): SQL =>
  convertToBaseCurrency({
    amount,
    exchangeRate: DbSchema.Ledger.Journal.PostingsSchema.exchangeRate,
    decimalsShift: decimalsShiftSql,
  });

// TODO: function COALESCE(SUM(ROUND... duplicate account balance
const baseCurrencyDebitSql = sql`COALESCE(SUM(${baseCurrencyAmountSql(DbSchema.Ledger.Journal.PostingsSchema.debit)}), 0)`;
const baseCurrencyCreditSql = sql`COALESCE(SUM(${baseCurrencyAmountSql(DbSchema.Ledger.Journal.PostingsSchema.credit)}), 0)`;

interface SelectTotalColumns {
  debit: SQL;
  credit: SQL;
}

const createSelect = ({ tx, totals }: { tx: Tx; totals: SelectTotalColumns }) =>
  tx
    .select({
      type: DbSchema.Core.Vat.VatRatesSchema.type,
      rate: DbSchema.Core.Vat.VatRatesSchema.rate,
      netRate: DbSchema.Core.Vat.VatRatesSchema.netRate,
      startOn: DbSchema.Core.Vat.VatRatesSchema.startOn,
      endOn: DbSchema.Core.Vat.VatRatesSchema.endOn,
      totalDebit: castCurrencyValue(totals.debit).as("total_debit"),
      totalCredit: castCurrencyValue(totals.credit).as("total_credit"),
    })
    .from(DbSchema.Ledger.Journal.PostingsSchema)
    .$dynamic()
    .innerJoin(
      DbSchema.Ledger.Journal.JournalEntriesSchema,
      eq(
        DbSchema.Ledger.Journal.PostingsSchema.journalEntryId,
        DbSchema.Ledger.Journal.JournalEntriesSchema.id,
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
    );

type PostingsByVatSelect = ReturnType<typeof createSelect>;

const selectPostingsByVat = async ({
  tx,
  organizationId,
  startOn,
  endOn,
  totals = { debit: baseCurrencyDebitSql, credit: baseCurrencyCreditSql },
  join,
  where,
}: {
  tx: Tx;
  organizationId: OrganizationId;
  totals?: SelectTotalColumns;
  join: (query: PostingsByVatSelect) => PgAsyncSelect;
  where?: SQL;
} & Pick<Records["Core"]["VatPeriods"]["Select"], "startOn" | "endOn">): Promise<
  z.infer<typeof PostingsByVatResultsSchema>
> => {
  const query = createSelect({ tx, totals });

  const result = await join(query)
    .where(
      and(
        eq(DbSchema.Ledger.Journal.JournalEntriesSchema.organizationId, organizationId),
        gte(DbSchema.Ledger.Journal.JournalEntriesSchema.validOn, startOn),
        lte(DbSchema.Ledger.Journal.JournalEntriesSchema.validOn, endOn),
        where,
      ),
    )
    .groupBy(
      DbSchema.Core.Vat.VatRatesSchema.id,
      DbSchema.Core.Vat.VatRatesSchema.type,
      DbSchema.Core.Vat.VatRatesSchema.rate,
      DbSchema.Core.Vat.VatRatesSchema.netRate,
      DbSchema.Core.Vat.VatRatesSchema.startOn,
      DbSchema.Core.Vat.VatRatesSchema.endOn,
    );

  return PostingsByVatResultsSchema.parse(result);
};

/**
 * Retrieve EXPENSES by querying the journal postings that match the period and related account type.
 */
export const getVatDeclarationExpenses = async ({
  tx,
  organizationId,
  startOn,
  endOn,
}: {
  tx: Tx;
  organizationId: OrganizationId;
} & Pick<Records["Core"]["VatPeriods"]["Select"], "startOn" | "endOn">): Promise<
  z.infer<typeof PostingsByVatResultsSchema>
> =>
  await selectPostingsByVat({
    tx,
    organizationId,
    startOn,
    endOn,
    join: (query) =>
      query
        .innerJoin(
          DbSchema.Ledger.Accounts.AccountsSchema,
          eq(
            DbSchema.Ledger.Journal.PostingsSchema.accountId,
            DbSchema.Ledger.Accounts.AccountsSchema.id,
          ),
        )
        .innerJoin(
          DbSchema.Core.Vat.VatRatesSchema,
          eq(DbSchema.Ledger.Journal.PostingsSchema.vatRateId, DbSchema.Core.Vat.VatRatesSchema.id),
        ),
    where: eq(DbSchema.Ledger.Accounts.AccountsSchema.type, AccountType.EXPENSE),
  });

/**
 * Retrieve the INPUT TAXES (Vorsteuer) of the effective method: the tax booked on the input tax accounts
 * (1170 materials and services, 1171 investments), by VAT rate. It covers the VAT lines the journal
 * generates for input tax and for acquisition tax, and the import tax paid to the customs (booked
 * directly on the input tax account with an import tax rate). The tax is the debits minus the credits.
 */
export const getVatDeclarationInputTaxes = async ({
  tx,
  organizationId,
  startOn,
  endOn,
}: {
  tx: Tx;
  organizationId: OrganizationId;
} & Pick<Records["Core"]["VatPeriods"]["Select"], "startOn" | "endOn">): Promise<
  z.infer<typeof PostingsByVatResultsSchema>
> =>
  await selectPostingsByVat({
    tx,
    organizationId,
    startOn,
    endOn,
    join: (query) =>
      query
        .innerJoin(
          DbSchema.Ledger.SystemAccounts.SystemAccountsSchema,
          and(
            eq(
              DbSchema.Ledger.SystemAccounts.SystemAccountsSchema.accountId,
              DbSchema.Ledger.Journal.PostingsSchema.accountId,
            ),
            inArray(DbSchema.Ledger.SystemAccounts.SystemAccountsSchema.purpose, [
              SystemAccountPurpose.TAX_PRE_MATERIAL,
              SystemAccountPurpose.TAX_PRE_INVESTMENT,
            ]),
          ),
        )
        .innerJoin(
          DbSchema.Core.Vat.VatRatesSchema,
          eq(DbSchema.Ledger.Journal.PostingsSchema.vatRateId, DbSchema.Core.Vat.VatRatesSchema.id),
        ),
    where: inArray(DbSchema.Core.Vat.VatRatesSchema.type, [
      VatType.INPUT_TAX_MATERIALS,
      VatType.INPUT_TAX_INVESTMENTS,
      VatType.IMPORT_TAX_MATERIALS,
      VatType.IMPORT_TAX_INVESTMENTS,
      VatType.ACQUISITION_TAX_MATERIALS,
      VatType.ACQUISITION_TAX_INVESTMENTS,
    ]),
  });

/**
 * Retrieve NON-CONSIDERATIONS (donations, dividends, damages...) by querying the journal postings that match the period
 * and are booked on income accounts. Unlike the turnover, those are not necessarily invoiced (e.g. a donation received),
 * therefore every journal entry of the period is considered, linked to an invoice or not.
 */
export const getVatDeclarationNonConsiderations = async ({
  tx,
  organizationId,
  startOn,
  endOn,
}: {
  tx: Tx;
  organizationId: OrganizationId;
} & Pick<Records["Core"]["VatPeriods"]["Select"], "startOn" | "endOn">): Promise<
  z.infer<typeof PostingsByVatResultsSchema>
> =>
  await selectPostingsByVat({
    tx,
    organizationId,
    startOn,
    endOn,
    join: (query) =>
      query
        .innerJoin(
          DbSchema.Ledger.Accounts.AccountsSchema,
          eq(
            DbSchema.Ledger.Journal.PostingsSchema.accountId,
            DbSchema.Ledger.Accounts.AccountsSchema.id,
          ),
        )
        .innerJoin(
          DbSchema.Core.Vat.VatRatesSchema,
          eq(DbSchema.Ledger.Journal.PostingsSchema.vatRateId, DbSchema.Core.Vat.VatRatesSchema.id),
        ),
    where: and(
      eq(DbSchema.Ledger.Accounts.AccountsSchema.type, AccountType.INCOME),
      eq(DbSchema.Core.Vat.VatRatesSchema.type, VatType.NON_CONSIDERATION),
    ),
  });

/**
 * Retrieve the MANUAL INCOMES: the turnover booked directly in the journal, e.g. a cash sale or an entry
 * migrated from the previous accounting tool, on income accounts with a net rate tax, a sales tax or a
 * non-taxable turnover rate. The entries of an invoice are excluded, they are counted with the invoice incomes.
 *
 * The line carrying the rate is the gross amount, VAT included. Its generated VAT lines are not counted:
 * the tax owed is booked on the tax due account, and the line moving it back from the income account
 * carries no rate.
 *
 * A manual sale is counted on the date of its entry with both remuneration methods, it is booked when it
 * is agreed and received.
 */
export const getVatDeclarationManualIncomes = async ({
  tx,
  organizationId,
  startOn,
  endOn,
}: {
  tx: Tx;
  organizationId: OrganizationId;
} & Pick<Records["Core"]["VatPeriods"]["Select"], "startOn" | "endOn">): Promise<
  z.infer<typeof PostingsByVatResultsSchema>
> =>
  await selectPostingsByVat({
    tx,
    organizationId,
    startOn,
    endOn,
    join: (query) =>
      query
        .innerJoin(
          DbSchema.Ledger.Accounts.AccountsSchema,
          eq(
            DbSchema.Ledger.Journal.PostingsSchema.accountId,
            DbSchema.Ledger.Accounts.AccountsSchema.id,
          ),
        )
        .innerJoin(
          DbSchema.Core.Vat.VatRatesSchema,
          eq(DbSchema.Ledger.Journal.PostingsSchema.vatRateId, DbSchema.Core.Vat.VatRatesSchema.id),
        ),
    where: and(
      eq(DbSchema.Ledger.Accounts.AccountsSchema.type, AccountType.INCOME),
      inArray(DbSchema.Core.Vat.VatRatesSchema.type, [
        VatType.NET_RATE_TAX,
        VatType.SALES_TAX_DUE,
        VatType.NON_TAXABLE_TURNOVER,
      ]),
      not(
        exists(
          tx
            .select({ id: DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.id })
            .from(DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema)
            .where(
              eq(
                DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.journalEntryId,
                DbSchema.Ledger.Journal.JournalEntriesSchema.id,
              ),
            ),
        ),
      ),
    ),
  });

/**
 * Retrieve the BAD DEBTS of the agreed method: the invoices written off as uncollectible in the period,
 * grouped by the VAT rate of the invoice. Their turnover was declared when they were opened, the loss
 * reduces it (Box 235). The write-off credits the receivable with the unpaid gross amount, VAT included,
 * the asset credits are therefore the loss.
 *
 * Not needed with the received method: an unpaid invoice is never declared.
 */
export const getVatDeclarationBadDebts = async ({
  tx,
  organizationId,
  startOn,
  endOn,
}: {
  tx: Tx;
  organizationId: OrganizationId;
} & Pick<Records["Core"]["VatPeriods"]["Select"], "startOn" | "endOn">): Promise<
  z.infer<typeof PostingsByVatResultsSchema>
> =>
  await selectPostingsByVat({
    tx,
    organizationId,
    startOn,
    endOn,
    join: (query) =>
      query
        .innerJoin(
          DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema,
          and(
            eq(
              DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.journalEntryId,
              DbSchema.Ledger.Journal.JournalEntriesSchema.id,
            ),
            eq(
              DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.type,
              InvoiceJournalEntryType.UNCOLLECTIBLE,
            ),
          ),
        )
        .innerJoin(
          DbSchema.Ledger.Accounts.AccountsSchema,
          eq(
            DbSchema.Ledger.Journal.PostingsSchema.accountId,
            DbSchema.Ledger.Accounts.AccountsSchema.id,
          ),
        )
        .innerJoin(
          DbSchema.Billing.Invoices.InvoicesSchema,
          eq(
            DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.invoiceId,
            DbSchema.Billing.Invoices.InvoicesSchema.id,
          ),
        )
        .innerJoin(
          DbSchema.Core.Vat.VatRatesSchema,
          eq(
            DbSchema.Billing.Invoices.InvoicesSchema.vatRateId,
            DbSchema.Core.Vat.VatRatesSchema.id,
          ),
        ),
    where: eq(DbSchema.Ledger.Accounts.AccountsSchema.type, AccountType.ASSET),
  });

/**
 * Retrieve INCOMES based on postings linked to invoices, grouped by the VAT rate of the invoice, according to their remuneration method:
 * - AGREED: the receivable of the invoice issue entries ("open" entries), debits = gross amount incl. VAT,
 *   minus its credits in the entries cancelling them ("void" entries). Only the receivable is read, so a VAT
 *   posting inside the entry (e.g. a migrated sale entry) does not count as turnover.
 * - RECEIVED: linked to invoice payment dates ("payment" entries).
 */
export const getVatDeclarationIncomes = async ({
  tx,
  organizationId,
  startOn,
  endOn,
  remunerationMethod,
}: {
  tx: Tx;
  organizationId: OrganizationId;
  remunerationMethod: VatRemunerationMethod;
} & Pick<Records["Core"]["VatPeriods"]["Select"], "startOn" | "endOn">): Promise<
  z.infer<typeof PostingsByVatResultsSchema>
> => {
  // ------------------------------------------------------------------------
  // 1. AGREED METHOD
  // ------------------------------------------------------------------------
  if (remunerationMethod === VatRemunerationMethod.AGREED) {
    return await selectPostingsByVat({
      tx,
      organizationId,
      startOn,
      endOn,
      join: (query) =>
        query
          .innerJoin(
            DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema,
            and(
              eq(
                DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.journalEntryId,
                DbSchema.Ledger.Journal.JournalEntriesSchema.id,
              ),
              inArray(DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.type, [
                InvoiceJournalEntryType.OPEN,
                InvoiceJournalEntryType.VOID,
              ]),
            ),
          )
          .innerJoin(
            DbSchema.Ledger.Accounts.AccountsSchema,
            eq(
              DbSchema.Ledger.Journal.PostingsSchema.accountId,
              DbSchema.Ledger.Accounts.AccountsSchema.id,
            ),
          )
          .innerJoin(
            DbSchema.Billing.Invoices.InvoicesSchema,
            eq(
              DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.invoiceId,
              DbSchema.Billing.Invoices.InvoicesSchema.id,
            ),
          )
          .innerJoin(
            DbSchema.Core.Vat.VatRatesSchema,
            eq(
              DbSchema.Billing.Invoices.InvoicesSchema.vatRateId,
              DbSchema.Core.Vat.VatRatesSchema.id,
            ),
          ),
      where: eq(DbSchema.Ledger.Accounts.AccountsSchema.type, AccountType.ASSET),
    });
  }

  // ------------------------------------------------------------------------
  // 2. RECEIVED METHOD
  // ------------------------------------------------------------------------

  return await selectPostingsByVat({
    tx,
    organizationId,
    startOn,
    endOn,
    join: (query) =>
      query
        .innerJoin(
          DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema,
          and(
            eq(
              DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.journalEntryId,
              DbSchema.Ledger.Journal.JournalEntriesSchema.id,
            ),
            eq(
              DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.type,
              InvoiceJournalEntryType.PAYMENT,
            ),
          ),
        )
        .innerJoin(
          DbSchema.Ledger.Accounts.AccountsSchema,
          eq(
            DbSchema.Ledger.Journal.PostingsSchema.accountId,
            DbSchema.Ledger.Accounts.AccountsSchema.id,
          ),
        )
        .innerJoin(
          DbSchema.Billing.Invoices.InvoicesSchema,
          eq(
            DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.invoiceId,
            DbSchema.Billing.Invoices.InvoicesSchema.id,
          ),
        )
        .innerJoin(
          DbSchema.Core.Vat.VatRatesSchema,
          eq(
            DbSchema.Billing.Invoices.InvoicesSchema.vatRateId,
            DbSchema.Core.Vat.VatRatesSchema.id,
          ),
        ),
    where: eq(DbSchema.Ledger.Accounts.AccountsSchema.type, AccountType.ASSET),
  });
};
