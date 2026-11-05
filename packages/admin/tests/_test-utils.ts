import { and, eq, sql, TransactionRollbackError } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { assertNonNullish, type Result, tryCatch } from "@usenullish/nullish-common";
import { type DbInstance, openDb, type Tx } from "@usenullish/nullish-db";
import {
  DbSchema,
  type SystemAccountPurpose,
  VatPaymentMethod,
  VatRemunerationMethod,
  VatType,
  LegalForm,
} from "@usenullish/nullish-schema/db";

type TestDb = ReturnType<typeof drizzle>;

const users = DbSchema.Auth.Auth.users;
const organizations = DbSchema.Core.Organizations.OrganizationsSchema;
const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const accounts = DbSchema.Ledger.Accounts.AccountsSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;
const clients = DbSchema.Billing.Clients.ClientsSchema;
const contacts = DbSchema.Billing.Clients.ContactsSchema;
const invoices = DbSchema.Billing.Invoices.InvoicesSchema;
const lines = DbSchema.Billing.Invoices.LinesSchema;
const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;
const vatSettings = DbSchema.Core.Vat.VatSettingsSchema;
const vatMethods = DbSchema.Core.Vat.VatMethodsSchema;

export const TEST_USER_ID = "user-00000000-0000-4000-8000-000000000000";
export const TEST_OTHER_USER_ID = "user-11111111-1111-4111-8111-111111111111";
export const TEST_MISSING_ORG_ID = "99999999-9999-4999-8999-999999999999";
export const TEST_MISSING_ID = "88888888-8888-4888-8888-888888888888";

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

export const createPeriod = async ({
  tx,
  organizationId,
  startOn,
  endOn,
}: {
  tx: Tx;
  organizationId: string;
  startOn: Date;
  endOn: Date;
}): Promise<Result<void>> =>
  tryCatch(async () => {
    await tx.insert(periods).values({ organizationId, startOn, endOn });
  });

export const withUser = <T>(db: TestDb, userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return fn(tx);
  });

export const withAuthenticatedUser = <T>(
  db: TestDb,
  userId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return fn(tx);
  });

const withRollback = async <T>(db: TestDb, fn: (tx: Tx) => Promise<T>): Promise<T> => {
  const results: T[] = [];

  await db
    .transaction(async (tx) => {
      results.push(await fn(tx));
      tx.rollback();
    })
    .catch((err: unknown) => {
      if (!(err instanceof TransactionRollbackError)) {
        throw err;
      }
    });

  const [result] = results;
  assertNonNullish(result);
  return result;
};

export const withUserRolledBack = <T>(
  db: TestDb,
  userId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> =>
  withRollback(db, async (tx) => {
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return fn(tx);
  });

export const withAuthenticatedUserRolledBack = <T>(
  db: TestDb,
  userId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> =>
  withRollback(db, async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return fn(tx);
  });

export const createOrganization = async (db: TestDb, userId: string): Promise<string> => {
  const rows = await withUser(db, userId, (tx) =>
    tx
      .insert(organizations)
      .values({ name: `Org ${userId}`, legalForm: LegalForm.LLC })
      .returning(),
  );

  const [org] = rows;
  assertNonNullish(org);
  await db.delete(periods).where(eq(periods.organizationId, org.id));
  return org.id;
};

export const accountByCode = async (db: TestDb, organizationId: string, code: string) => {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.organizationId, organizationId), eq(accounts.code, code)))
    .limit(1);

  assertNonNullish(row);
  return row;
};

export const systemAccountByPurpose = async (
  db: TestDb,
  organizationId: string,
  purpose: SystemAccountPurpose,
) => {
  const [row] = await db
    .select()
    .from(systemAccounts)
    .where(
      and(eq(systemAccounts.organizationId, organizationId), eq(systemAccounts.purpose, purpose)),
    )
    .limit(1);

  assertNonNullish(row);
  return row;
};

export const clientByName = async (db: TestDb, organizationId: string, name: string) => {
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.organizationId, organizationId), eq(clients.name, name)))
    .limit(1);

  assertNonNullish(row);
  return row;
};

export const contactsByClientId = (db: TestDb, clientId: string) =>
  db.select().from(contacts).where(eq(contacts.clientId, clientId));

export const createClient = async (db: TestDb, organizationId: string): Promise<string> => {
  const [row] = await db
    .insert(clients)
    .values({ organizationId, name: "Test Client" })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createInvoice = async (
  db: TestDb,
  args: { organizationId: string; clientId: string },
): Promise<string> => {
  const [row] = await db
    .insert(invoices)
    .values({
      organizationId: args.organizationId,
      clientId: args.clientId,
      issueOn: new Date("2026-01-01"),
      currency: "CHF",
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const linesByInvoiceId = (db: TestDb, invoiceId: string) =>
  db.select().from(lines).where(eq(lines.invoiceId, invoiceId));

export const journalEntryByReference = async (
  db: TestDb,
  organizationId: string,
  reference: string,
) => {
  const [row] = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.organizationId, organizationId),
        eq(journalEntries.reference, reference),
      ),
    )
    .limit(1);

  assertNonNullish(row);
  return row;
};

export const createVatRate = async (
  db: TestDb,
  organizationId: string,
  type: VatType = VatType.NET_RATE_TAX,
): Promise<string> => {
  const [row] = await db
    .insert(vatRates)
    .values({
      organizationId,
      code: type,
      type,
      rate: 8.1,
      netRate: type === VatType.NET_RATE_TAX ? 6.2 : null,
      startOn: new Date("2026-01-01"),
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

export const createVatSettings = async (db: TestDb, organizationId: string): Promise<void> => {
  await db.insert(vatSettings).values({ organizationId, vatNumber: "CHE-123.456.789 MWST" });
};

export const insertVatMethods = async (
  db: TestDb,
  organizationId: string,
  {
    periodId,
    remunerationMethod = VatRemunerationMethod.AGREED,
    paymentMethod = VatPaymentMethod.NET_RATE,
  }: {
    periodId: string;
    remunerationMethod?: VatRemunerationMethod;
    paymentMethod?: VatPaymentMethod;
  },
): Promise<void> => {
  await db
    .insert(vatMethods)
    .values({ organizationId, periodId, remunerationMethod, paymentMethod });
};

export const openTestDb = async (): Promise<DbInstance> => {
  const opened = await openDb();

  if (opened.status === "error") {
    throw opened.err;
  }

  return opened.result;
};
