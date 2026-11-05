import { CryptoHasher } from "bun";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  DbSchema,
  InvoiceJournalEntryType,
  InvoiceLineType,
  MigrationDatasetType,
  MigrationProvider,
  PeriodJournalEntryType,
  PeriodStatus,
  SystemAccountPurpose,
  VatPaymentMethod,
  VatPeriodStatus,
  VatRemunerationMethod,
  VatType,
  LegalForm,
} from "@usenullish/nullish-schema/db";

type TestDb = ReturnType<typeof drizzle>;

const users = DbSchema.Auth.Auth.users;

export const organizations = DbSchema.Core.Organizations.OrganizationsSchema;
export const periods = DbSchema.Ledger.Periods.PeriodsSchema;
export const memberships = DbSchema.Core.Memberships.MembershipsSchema;
export const accountingSettings = DbSchema.Core.Accounting.AccountingSettingsSchema;
export const billingSettings = DbSchema.Core.Billing.BillingSettingsSchema;
export const bankRelations = DbSchema.Core.Bank.BankRelationsSchema;
export const vatSettings = DbSchema.Core.Vat.VatSettingsSchema;
export const vatMethods = DbSchema.Core.Vat.VatMethodsSchema;
export const vatRates = DbSchema.Core.Vat.VatRatesSchema;
export const vatPeriods = DbSchema.Core.Vat.VatPeriodsSchema;
export const clients = DbSchema.Billing.Clients.ClientsSchema;
export const lines = DbSchema.Billing.Invoices.LinesSchema;
export const invoiceJournalEntries = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;
export const periodJournalEntries = DbSchema.Ledger.PeriodJournal.PeriodJournalEntriesSchema;
export const accounts = DbSchema.Ledger.Accounts.AccountsSchema;
export const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
export const postings = DbSchema.Ledger.Journal.PostingsSchema;
export const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;
export const currencies = DbSchema.Core.Currencies.CurrenciesSchema;
export const invoices = DbSchema.Billing.Invoices.InvoicesSchema;
export const bankStatements = DbSchema.Banking.Statements.StatementsSchema;
export const bankMovements = DbSchema.Banking.Movements.MovementsSchema;
export const bankMovementJournalEntries =
  DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema;
export const migrations = DbSchema.Migration.Migrations.MigrationsSchema;
export const migrationDatasets = DbSchema.Migration.Datasets.DatasetsSchema;

export const TEST_USER_ID = "user-00000000-0000-4000-8000-000000000000";
export const TEST_OTHER_USER_ID = "user-11111111-1111-4111-8111-111111111111";

export const causeMessage = (error: unknown): string =>
  error instanceof Error && error.cause instanceof Error ? error.cause.message : String(error);

export const resetDb = (db: TestDb): Promise<unknown> =>
  db.execute(sql`TRUNCATE auth.users, core.organizations, audit.logs CASCADE;`);

export const seedUsers = (db: TestDb): Promise<unknown> =>
  db.insert(users).values(
    [TEST_USER_ID, TEST_OTHER_USER_ID].map((id) => ({
      id,
      name: id,
      email: `${id}@test.dev`,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );

export const insertOrganization = async (
  db: TestDb,
  { legalForm = LegalForm.LLC }: { legalForm?: LegalForm } = {},
): Promise<string> => {
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);
    return tx
      .insert(organizations)
      .values({ name: `Org ${TEST_USER_ID}`, legalForm })
      .returning();
  });

  const [org] = rows;
  assertNonNullish(org);
  return org.id;
};

export const createOrganization = async (
  db: TestDb,
  { legalForm }: { legalForm?: LegalForm } = {},
): Promise<string> => {
  const organizationId = await insertOrganization(db, { legalForm });
  await db.delete(periods).where(eq(periods.organizationId, organizationId));
  return organizationId;
};

export const leafAccountId = async (
  db: TestDb,
  organizationId: string,
  type: AccountType,
): Promise<string> => {
  const rows = await db
    .select({ id: accounts.id, parentId: accounts.parentId, type: accounts.type })
    .from(accounts)
    .where(eq(accounts.organizationId, organizationId));

  const parentIds = new Set(
    rows.map((row) => row.parentId).filter((value): value is string => value !== null),
  );
  const leaf = rows.find((row) => row.type === type && !parentIds.has(row.id));
  assertNonNullish(leaf);
  return leaf.id;
};

export const accountByCode = async (
  db: TestDb,
  organizationId: string,
  code: string,
): Promise<{ id: string; parentId: string | null; type: AccountType }> => {
  const rows = await db
    .select({
      id: accounts.id,
      parentId: accounts.parentId,
      type: accounts.type,
      code: accounts.code,
    })
    .from(accounts)
    .where(eq(accounts.organizationId, organizationId));

  const row = rows.find((candidate) => candidate.code === code);
  assertNonNullish(row);
  return row;
};

export const systemAccountByPurpose = async (
  db: TestDb,
  organizationId: string,
  purpose: SystemAccountPurpose,
): Promise<{ accountId: string }> => {
  const [row] = await db
    .select({ accountId: systemAccounts.accountId })
    .from(systemAccounts)
    .where(
      and(eq(systemAccounts.organizationId, organizationId), eq(systemAccounts.purpose, purpose)),
    );
  assertNonNullish(row);
  return row;
};

export const systemAccountId = async (db: TestDb, organizationId: string): Promise<string> => {
  const [row] = await db
    .select({ id: systemAccounts.id })
    .from(systemAccounts)
    .where(eq(systemAccounts.organizationId, organizationId))
    .limit(1);
  assertNonNullish(row);
  return row.id;
};

export const createPeriod = async (
  db: TestDb,
  organizationId: string,
  { startOn, endOn, status }: { startOn: Date; endOn?: Date; status?: PeriodStatus },
): Promise<string> => {
  const [row] = await db
    .insert(periods)
    .values({
      organizationId,
      startOn,
      endOn: endOn ?? new Date("2099-12-31"),
      status,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createJournalEntry = async (
  db: TestDb,
  organizationId: string,
  validOn: Date,
): Promise<string> => {
  const [row] = await db.insert(journalEntries).values({ organizationId, validOn }).returning();
  assertNonNullish(row);
  return row.id;
};

export const adminMembership = async (
  db: TestDb,
  organizationId: string,
): Promise<{ id: string; userId: string; organizationId: string }> => {
  const [row] = await db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      organizationId: memberships.organizationId,
    })
    .from(memberships)
    .where(eq(memberships.organizationId, organizationId));
  assertNonNullish(row);
  return row;
};

export const accountingSettingsRow = async (
  db: TestDb,
  organizationId: string,
): Promise<{ id: string; baseCurrency: string }> => {
  const [row] = await db
    .select({ id: accountingSettings.id, baseCurrency: accountingSettings.baseCurrency })
    .from(accountingSettings)
    .where(eq(accountingSettings.organizationId, organizationId));
  assertNonNullish(row);
  return row;
};

export const billingSettingsRow = async (
  db: TestDb,
  organizationId: string,
): Promise<{ id: string; paymentTermDays: number }> => {
  const [row] = await db
    .select({ id: billingSettings.id, paymentTermDays: billingSettings.paymentTermDays })
    .from(billingSettings)
    .where(eq(billingSettings.organizationId, organizationId));
  assertNonNullish(row);
  return row;
};

export const createVatSettings = async (db: TestDb, organizationId: string): Promise<string> => {
  const [row] = await db
    .insert(vatSettings)
    .values({
      organizationId,
      vatNumber: "CHE-123.456.789 MWST",
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createVatMethods = async (
  db: TestDb,
  organizationId: string,
  {
    periodId,
    remunerationMethod,
    paymentMethod,
  }: {
    periodId: string;
    remunerationMethod?: VatRemunerationMethod;
    paymentMethod?: VatPaymentMethod;
  },
): Promise<string> => {
  const [row] = await db
    .insert(vatMethods)
    .values({
      organizationId,
      periodId,
      remunerationMethod: remunerationMethod ?? VatRemunerationMethod.AGREED,
      paymentMethod: paymentMethod ?? VatPaymentMethod.NET_RATE,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createVatRate = async (
  db: TestDb,
  organizationId: string,
  overrides: {
    code?: string;
    type?: VatType;
    rate?: number;
    netRate?: number;
    startOn?: Date;
    endOn?: Date;
  } = {},
): Promise<string> => {
  const [row] = await db
    .insert(vatRates)
    .values({
      organizationId,
      code: overrides.code ?? "UN81",
      type: overrides.type ?? VatType.NON_TAXABLE_TURNOVER,
      rate: overrides.rate ?? 0,
      netRate: overrides.netRate,
      startOn: overrides.startOn ?? new Date("2026-01-01"),
      endOn: overrides.endOn,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createVatPeriod = async (
  db: TestDb,
  organizationId: string,
  { startOn, endOn, status }: { startOn: Date; endOn: Date; status?: VatPeriodStatus },
): Promise<string> => {
  const [row] = await db
    .insert(vatPeriods)
    .values({ organizationId, startOn, endOn, status })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const vatPeriodsOf = (
  db: TestDb,
  organizationId: string,
): Promise<{ startOn: Date; endOn: Date; status: VatPeriodStatus }[]> =>
  db
    .select({ startOn: vatPeriods.startOn, endOn: vatPeriods.endOn, status: vatPeriods.status })
    .from(vatPeriods)
    .where(eq(vatPeriods.organizationId, organizationId))
    .orderBy(vatPeriods.startOn);

export const generateVatPeriods = (
  db: TestDb,
  organizationId: string,
  startOn: string,
  {
    endOn,
    paymentMethod = VatPaymentMethod.NET_RATE,
  }: { endOn?: string; paymentMethod?: VatPaymentMethod } = {},
): Promise<unknown> =>
  db.execute(
    sql`SELECT core.generate_vat_periods(${organizationId}::uuid, ${startOn}::date, ${paymentMethod}::core.vat_payment_method, ${endOn ?? null}::date)`,
  );

export const createClient = async (db: TestDb, organizationId: string): Promise<string> => {
  const [row] = await db
    .insert(clients)
    .values({ organizationId, name: "Test Client" })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createDraftInvoice = async (
  db: TestDb,
  organizationId: string,
  clientId: string,
  overrides: { currency?: string; exchangeRate?: number; vatRateId?: string; issueOn?: Date } = {},
): Promise<string> => {
  const [row] = await db
    .insert(invoices)
    .values({
      organizationId,
      clientId,
      issueOn: overrides.issueOn ?? new Date("2026-01-01"),
      currency: overrides.currency ?? "CHF",
      exchangeRate: overrides.exchangeRate ?? 1,
      vatRateId: overrides.vatRateId,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createLine = async (
  db: TestDb,
  invoiceId: string,
  overrides: {
    type?: InvoiceLineType;
    description?: string;
    quantity?: number;
    unitPrice?: bigint;
  } = {},
): Promise<string> => {
  const [row] = await db
    .insert(lines)
    .values({
      organizationId: sql`(SELECT organization_id FROM billing.invoices WHERE id = ${invoiceId})`,
      invoiceId,
      type: overrides.type ?? InvoiceLineType.ITEM,
      description: overrides.description ?? "Test line",
      quantity: overrides.quantity ?? 1,
      unitPrice: overrides.unitPrice ?? 1000n,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createInvoiceJournalEntry = async (
  db: TestDb,
  invoiceId: string,
  journalEntryId: string,
  type: InvoiceJournalEntryType = InvoiceJournalEntryType.OPEN,
): Promise<string> => {
  const [row] = await db
    .insert(invoiceJournalEntries)
    .values({
      organizationId: sql`(SELECT organization_id FROM billing.invoices WHERE id = ${invoiceId})`,
      invoiceId,
      journalEntryId,
      type,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createPeriodJournalEntry = async (
  db: TestDb,
  periodId: string,
  journalEntryId: string,
  type: PeriodJournalEntryType = PeriodJournalEntryType.OPENING,
): Promise<string> => {
  const [row] = await db
    .insert(periodJournalEntries)
    .values({
      organizationId: sql`(SELECT organization_id FROM ledger.periods WHERE id = ${periodId})`,
      periodId,
      journalEntryId,
      type,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createBankRelation = async (
  db: TestDb,
  organizationId: string,
  {
    accountId,
    iban = "CH9300762011623852957",
    invoiceIban,
  }: { accountId: string; iban?: string; invoiceIban?: string },
): Promise<string> => {
  const [row] = await db
    .insert(bankRelations)
    .values({ organizationId, name: "Main bank", iban, invoiceIban, currency: "CHF", accountId })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createBankStatement = async (
  db: TestDb,
  organizationId: string,
  bankRelationId: string,
  { bankStatementId = crypto.randomUUID() }: { bankStatementId?: string } = {},
): Promise<string> => {
  const [row] = await db
    .insert(bankStatements)
    .values({
      organizationId,
      bankRelationId,
      bankMessageId: crypto.randomUUID(),
      bankStatementId,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
      openingBalance: 0n,
      closingBalance: 1000n,
      currency: "CHF",
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createBankMovement = async (
  db: TestDb,
  {
    organizationId,
    bankRelationId,
    statementId,
    bankReference = crypto.randomUUID(),
    dedupeHash = randomDedupeHash(),
    amount = 1000n,
  }: {
    organizationId: string;
    bankRelationId: string;
    statementId: string;
    bankReference?: string | null;
    dedupeHash?: string;
    amount?: bigint;
  },
): Promise<string> => {
  const [row] = await db
    .insert(bankMovements)
    .values({
      organizationId,
      bankRelationId,
      statementId,
      bankReference,
      dedupeHash,
      bookedOn: new Date("2026-01-15"),
      amount,
      currency: "CHF",
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const dedupeHashOf = (value: string): string =>
  new CryptoHasher("sha256").update(value).digest("hex");

export const randomDedupeHash = (): string => dedupeHashOf(crypto.randomUUID());

export const createMigration = async (db: TestDb, organizationId: string): Promise<string> => {
  const [row] = await db
    .insert(migrations)
    .values({ organizationId, userId: TEST_USER_ID, provider: MigrationProvider.BEXIO })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createMigrationDataset = async (
  db: TestDb,
  organizationId: string,
  migrationId: string,
  type: MigrationDatasetType = MigrationDatasetType.JOURNAL,
): Promise<string> => {
  const [row] = await db
    .insert(migrationDatasets)
    .values({ organizationId, migrationId, type, name: "journal.xlsx", data: [] })
    .returning();
  assertNonNullish(row);
  return row.id;
};
