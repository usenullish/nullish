import { CryptoHasher } from "bun";
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  castCurrencyValue,
  DbMaterializedView,
  DbSchema,
  DocumentType,
  InvoiceLineType,
  MigrationProvider,
  type SystemAccountPurpose,
  type VatPaymentMethod,
  type VatRemunerationMethod,
  LegalForm,
} from "@usenullish/nullish-schema/db";
import type { DbStoreInitArgs } from "../src/store";

type TestDb = ReturnType<typeof drizzle>;

const accountBalancesMv = DbMaterializedView.Ledger.AccountBalances.AccountBalancesMaterializedView;

const users = DbSchema.Auth.Auth.users;
const organizations = DbSchema.Core.Organizations.OrganizationsSchema;
const clients = DbSchema.Billing.Clients.ClientsSchema;
const contacts = DbSchema.Billing.Clients.ContactsSchema;
const invoices = DbSchema.Billing.Invoices.InvoicesSchema;
const lines = DbSchema.Billing.Invoices.LinesSchema;
const accounts = DbSchema.Ledger.Accounts.AccountsSchema;
const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const documentTemplates = DbSchema.Core.Documents.DocumentTemplatesSchema;
const templateContents = DbSchema.Core.Documents.TemplateContentsSchema;
const bankRelations = DbSchema.Core.Bank.BankRelationsSchema;
const bankStatements = DbSchema.Banking.Statements.StatementsSchema;
const vatSettings = DbSchema.Core.Vat.VatSettingsSchema;
const vatMethods = DbSchema.Core.Vat.VatMethodsSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;

export const TEST_USER_ID =
  "user-00000000-0000-4000-8000-000000000000" as DbStoreInitArgs["userId"];
export const TEST_OTHER_USER_ID =
  "user-11111111-1111-4111-8111-111111111111" as DbStoreInitArgs["userId"];
export const TEST_MISSING_ID = "99999999-9999-4999-8999-999999999999";

const DEADLOCK_DETECTED = "40P01";
const RESET_MAX_ATTEMPTS = 5;
const RESET_RETRY_DELAY_MS = 100;

const isDeadlock = (err: unknown): boolean =>
  err instanceof Error &&
  (err.cause as { errno?: unknown } | undefined)?.errno === DEADLOCK_DETECTED;

const truncate = async ({ db, attempt }: { db: TestDb; attempt: number }): Promise<unknown> => {
  try {
    return await db.execute(sql`TRUNCATE auth.users, core.organizations, audit.logs CASCADE;`);
  } catch (err: unknown) {
    if (!isDeadlock(err) || attempt >= RESET_MAX_ATTEMPTS) {
      throw err;
    }

    await new Promise((resolve) => setTimeout(resolve, RESET_RETRY_DELAY_MS * attempt));

    return await truncate({ db, attempt: attempt + 1 });
  }
};

export const resetDb = (db: TestDb): Promise<unknown> => truncate({ db, attempt: 1 });

type AccountBalanceRow = {
  parentId: string | null;
  totalDebit: bigint | null;
  totalCredit: bigint | null;
  balance: bigint | null;
};

export const readAccountBalance = async (
  db: TestDb,
  accountId: string,
): Promise<AccountBalanceRow | undefined> => {
  const [row] = await db
    .select({
      parentId: accountBalancesMv.parentId,
      totalDebit: castCurrencyValue(accountBalancesMv.totalDebit),
      totalCredit: castCurrencyValue(accountBalancesMv.totalCredit),
      balance: castCurrencyValue(accountBalancesMv.balance),
    })
    .from(accountBalancesMv)
    .innerJoin(periods, eq(periods.id, accountBalancesMv.periodId))
    .where(eq(accountBalancesMv.accountId, accountId))
    .orderBy(desc(periods.startOn))
    .limit(1);
  return row;
};

export const waitFor = async <T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeoutMs = 8000, intervalMs = 25 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let value = await fn();
  while (!predicate(value)) {
    if (Date.now() >= deadline) {
      throw new Error("waitFor: condition was not met before the timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    value = await fn();
  }
  return value;
};

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

export const createOrganization = async (
  db: TestDb,
  userId: DbStoreInitArgs["userId"],
  { legalForm = LegalForm.LLC }: { legalForm?: LegalForm } = {},
): Promise<string> => {
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return tx
      .insert(organizations)
      .values({ name: `Org ${userId}`, legalForm })
      .returning();
  });

  const [org] = rows;
  assertNonNullish(org);
  await db.delete(periods).where(eq(periods.organizationId, org.id));
  return org.id;
};

export const leafAccountId = async (
  db: TestDb,
  organizationId: string,
  type: string,
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

export const ancestorAccountIds = async (
  db: TestDb,
  organizationId: string,
  accountId: string,
): Promise<string[]> => {
  const rows = await db
    .select({ id: accounts.id, parentId: accounts.parentId })
    .from(accounts)
    .where(eq(accounts.organizationId, organizationId));

  const parentById = new Map(rows.map((row) => [row.id, row.parentId]));

  const chain: string[] = [];
  let current: string | null = accountId;
  while (current !== null) {
    chain.push(current);
    current = parentById.get(current) ?? null;
  }
  return chain;
};

export const createClient = async (db: TestDb, organizationId: string): Promise<string> => {
  const [row] = await db
    .insert(clients)
    .values({ organizationId, name: "Test Client" })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createContact = async (db: TestDb, clientId: string): Promise<string> => {
  const [row] = await db
    .insert(contacts)
    .values({
      organizationId: sql`(SELECT organization_id FROM billing.clients WHERE id = ${clientId})`,
      clientId,
      lastName: "Test Contact",
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createVatSettings = async (
  db: TestDb,
  args: {
    organizationId: string;
    remunerationMethod: VatRemunerationMethod;
    paymentMethod: VatPaymentMethod;
  },
): Promise<void> => {
  await db
    .insert(vatSettings)
    .values({ organizationId: args.organizationId, vatNumber: "CHE-123.456.789 MWST" });

  const rows = await db
    .select({ id: periods.id })
    .from(periods)
    .where(eq(periods.organizationId, args.organizationId));

  await db.insert(vatMethods).values(
    rows.map(({ id }) => ({
      organizationId: args.organizationId,
      periodId: id,
      remunerationMethod: args.remunerationMethod,
      paymentMethod: args.paymentMethod,
    })),
  );
};

export const vatRateIdByCode = async (
  db: TestDb,
  args: { organizationId: string; code: string },
): Promise<string> => {
  const [row] = await db
    .select()
    .from(vatRates)
    .where(and(eq(vatRates.organizationId, args.organizationId), eq(vatRates.code, args.code)));
  assertNonNullish(row);
  return row.id;
};

export const systemAccountIdByPurpose = async (
  db: TestDb,
  args: { organizationId: string; purpose: SystemAccountPurpose },
): Promise<string> => {
  const [row] = await db
    .select()
    .from(systemAccounts)
    .where(
      and(
        eq(systemAccounts.organizationId, args.organizationId),
        eq(systemAccounts.purpose, args.purpose),
      ),
    );
  assertNonNullish(row);
  return row.accountId;
};

export const createDraftInvoice = async (
  db: TestDb,
  args: {
    organizationId: string;
    clientId: string;
    issueOn?: Date;
    currency?: string;
    exchangeRate?: number;
    vatRateId?: string | null;
  },
): Promise<string> => {
  const [row] = await db
    .insert(invoices)
    .values({
      organizationId: args.organizationId,
      clientId: args.clientId,
      issueOn: args.issueOn ?? new Date("2026-01-01"),
      currency: args.currency ?? "CHF",
      exchangeRate: args.exchangeRate,
      vatRateId: args.vatRateId,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createLine = async (
  db: TestDb,
  invoiceId: string,
  description = "Test line",
  overrides: { type?: InvoiceLineType; quantity?: number; unitPrice?: bigint } = {},
): Promise<string> => {
  const [row] = await db
    .insert(lines)
    .values({
      organizationId: sql`(SELECT organization_id FROM billing.invoices WHERE id = ${invoiceId})`,
      invoiceId,
      type: overrides.type ?? InvoiceLineType.ITEM,
      description,
      quantity: overrides.quantity ?? 1,
      unitPrice: overrides.unitPrice ?? 1000n,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createBankRelation = async (
  db: TestDb,
  organizationId: string,
  { iban = "CH9300762011623852957", invoiceIban }: { iban?: string; invoiceIban?: string } = {},
): Promise<string> => {
  const [row] = await db
    .insert(bankRelations)
    .values({
      organizationId,
      name: "Main bank",
      iban,
      invoiceIban,
      currency: "CHF",
      accountId: await leafAccountId(db, organizationId, AccountType.ASSET),
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createBankStatement = async (
  db: TestDb,
  {
    organizationId,
    bankRelationId,
    endOn = new Date("2026-01-31"),
    closingBalance = 0n,
  }: { organizationId: string; bankRelationId: string; endOn?: Date; closingBalance?: bigint },
): Promise<string> => {
  const [row] = await db
    .insert(bankStatements)
    .values({
      organizationId,
      bankRelationId,
      bankMessageId: crypto.randomUUID(),
      bankStatementId: crypto.randomUUID(),
      startOn: new Date("2026-01-01"),
      endOn,
      openingBalance: 0n,
      closingBalance,
      currency: "CHF",
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createDocumentTemplate = async (
  db: TestDb,
  organizationId: string,
  name = "Default Invoice",
): Promise<string> => {
  const [row] = await db
    .insert(documentTemplates)
    .values({
      organizationId,
      type: DocumentType.INVOICE,
      name,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createTemplateContent = async (
  db: TestDb,
  { templateId, language = "en" }: { templateId: string; language?: string },
): Promise<string> => {
  const [row] = await db
    .insert(templateContents)
    .values({
      organizationId: sql`(SELECT organization_id FROM core.document_templates WHERE id = ${templateId})`,
      templateId,
      language,
      html: "<html><body>Invoice</body></html>",
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const dedupeHashOf = (value: string): string =>
  new CryptoHasher("sha256").update(value).digest("hex");

export const randomDedupeHash = (): string => dedupeHashOf(crypto.randomUUID());

export const createMigration = async (
  db: TestDb,
  organizationId: string,
  userId: DbStoreInitArgs["userId"],
): Promise<string> => {
  const [row] = await db
    .insert(DbSchema.Migration.Migrations.MigrationsSchema)
    .values({ organizationId, userId, provider: MigrationProvider.BEXIO })
    .returning();
  assertNonNullish(row);
  return row.id;
};

const BEXIO_CLIENTS_COLUMNS = 75;

export const bexioClientsCsv = (
  rows: { type: string; name: string; city?: string }[],
): Uint8Array<ArrayBuffer> => {
  const header = Array.from({ length: BEXIO_CLIENTS_COLUMNS }, (_, index) => `column ${index}`);

  const lines = rows.map(({ type, name, city = "" }) => {
    const cells = Array.from({ length: BEXIO_CLIENTS_COLUMNS }, () => "");
    cells[4] = type;
    cells[5] = name;
    cells[11] = city;
    return cells;
  });

  const csv = [header, ...lines]
    .map((cells) => cells.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return new TextEncoder().encode(csv);
};
