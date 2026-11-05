import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  BankMovementStatus,
  DbSchema,
  InvoiceJournalEntryType,
  InvoiceStatus,
  MigrationStatus,
  PeriodJournalEntryType,
  PeriodStatus,
  VatPeriodStatus,
} from "@usenullish/nullish-schema/db";
import {
  accounts,
  bankMovementJournalEntries,
  bankMovements,
  createBankMovement,
  createBankRelation,
  createBankStatement,
  createClient,
  createDraftInvoice,
  createLine,
  createMigration,
  createMigrationDataset,
  createOrganization,
  createPeriod,
  createVatPeriod,
  invoiceJournalEntries,
  invoices,
  journalEntries,
  leafAccountId,
  lines,
  memberships,
  migrationDatasets,
  migrations,
  organizations,
  periodJournalEntries,
  periods,
  postings,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  vatPeriods,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const clients = DbSchema.Billing.Clients.ClientsSchema;

const insertEntry = async ({
  organizationId,
  reference,
  debitAccountId,
  creditAccountId,
  amount,
}: {
  organizationId: string;
  reference: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: bigint;
}): Promise<string> =>
  await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(journalEntries)
      .values({ organizationId, validOn: new Date("2026-01-15"), reference })
      .returning();
    assertNonNullish(entry);

    await tx.insert(postings).values([
      {
        organizationId,
        journalEntryId: entry.id,
        accountId: debitAccountId,
        debit: amount,
        currency: "CHF",
      },
      {
        organizationId,
        journalEntryId: entry.id,
        accountId: creditAccountId,
        credit: amount,
        currency: "CHF",
      },
    ]);

    return entry.id;
  });

const createBookkeptOrganization = async (): Promise<{
  organizationId: string;
  journalEntryIds: string[];
  invoiceId: string;
}> => {
  const organizationId = await createOrganization(db);

  await db
    .insert(memberships)
    .values({ organizationId, userId: TEST_OTHER_USER_ID, role: "accountant" });

  const periodId = await createPeriod(db, organizationId, {
    startOn: new Date("2026-01-01"),
    endOn: new Date("2026-12-31"),
  });

  await createVatPeriod(db, organizationId, {
    startOn: new Date("2026-01-01"),
    endOn: new Date("2026-06-30"),
    status: VatPeriodStatus.CLOSED,
  });

  const assetAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);
  const incomeAccountId = await leafAccountId(db, organizationId, AccountType.INCOME);

  const clientId = await createClient(db, organizationId);
  const invoiceId = await createDraftInvoice(db, organizationId, clientId, {
    issueOn: new Date("2026-01-15"),
  });
  await createLine(db, invoiceId);

  const invoiceEntryId = await insertEntry({
    organizationId,
    reference: "Invoice",
    debitAccountId: assetAccountId,
    creditAccountId: incomeAccountId,
    amount: 1000n,
  });

  await db.transaction(async (tx) => {
    await tx.insert(invoiceJournalEntries).values({
      organizationId,
      invoiceId,
      journalEntryId: invoiceEntryId,
      type: InvoiceJournalEntryType.OPEN,
    });
    await tx.update(invoices).set({ status: InvoiceStatus.OPEN }).where(eq(invoices.id, invoiceId));
  });

  const openingEntryId = await insertEntry({
    organizationId,
    reference: "Opening",
    debitAccountId: assetAccountId,
    creditAccountId: incomeAccountId,
    amount: 500n,
  });

  await db.insert(periodJournalEntries).values({
    organizationId,
    periodId,
    journalEntryId: openingEntryId,
    type: PeriodJournalEntryType.OPENING,
  });

  const bankRelationId = await createBankRelation(db, organizationId, {
    accountId: assetAccountId,
  });
  const statementId = await createBankStatement(db, organizationId, bankRelationId);
  const movementId = await createBankMovement(db, {
    organizationId,
    bankRelationId,
    statementId,
    amount: 1000n,
  });

  const bankEntryId = await insertEntry({
    organizationId,
    reference: "Bank",
    debitAccountId: assetAccountId,
    creditAccountId: incomeAccountId,
    amount: 1000n,
  });

  await db.transaction(async (tx) => {
    await tx
      .insert(bankMovementJournalEntries)
      .values({ organizationId, movementId, journalEntryId: bankEntryId });
    await tx
      .update(bankMovements)
      .set({ status: BankMovementStatus.RECONCILED })
      .where(eq(bankMovements.id, movementId));
  });

  await db.update(periods).set({ status: PeriodStatus.CLOSED }).where(eq(periods.id, periodId));

  const migrationId = await createMigration(db, organizationId);
  await createMigrationDataset(db, organizationId, migrationId);
  await db
    .update(migrations)
    .set({ status: MigrationStatus.SUCCEEDED })
    .where(eq(migrations.id, migrationId));

  return {
    organizationId,
    journalEntryIds: [invoiceEntryId, openingEntryId, bankEntryId],
    invoiceId,
  };
};

const deleteOrganization = (organizationId: string) =>
  db.transaction(async (tx) => {
    await tx.delete(organizations).where(eq(organizations.id, organizationId));
  });

describe("deleting an organization", () => {
  let organizationId: string;
  let journalEntryIds: string[];
  let invoiceId: string;
  let otherOrganizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    ({ organizationId, journalEntryIds, invoiceId } = await createBookkeptOrganization());
    otherOrganizationId = await createOrganization(db);

    await deleteOrganization(organizationId);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("deletes the organization", async () => {
    const rows = await db.select().from(organizations).where(eq(organizations.id, organizationId));

    expect(rows).toEqual([]);
  });

  test("deletes its memberships", async () => {
    const rows = await db
      .select()
      .from(memberships)
      .where(eq(memberships.organizationId, organizationId));

    expect(rows).toEqual([]);
  });

  test("deletes its closed periods and VAT periods", async () => {
    const periodRows = await db
      .select()
      .from(periods)
      .where(eq(periods.organizationId, organizationId));
    const vatPeriodRows = await db
      .select()
      .from(vatPeriods)
      .where(eq(vatPeriods.organizationId, organizationId));

    expect(periodRows).toEqual([]);
    expect(vatPeriodRows).toEqual([]);
  });

  test("deletes its journal entries with their postings and links", async () => {
    const entryRows = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.organizationId, organizationId));
    const postingRows = await db
      .select()
      .from(postings)
      .where(inArray(postings.journalEntryId, journalEntryIds));
    const invoiceLinks = await db
      .select()
      .from(invoiceJournalEntries)
      .where(inArray(invoiceJournalEntries.journalEntryId, journalEntryIds));
    const periodLinks = await db
      .select()
      .from(periodJournalEntries)
      .where(inArray(periodJournalEntries.journalEntryId, journalEntryIds));
    const movementLinks = await db
      .select()
      .from(bankMovementJournalEntries)
      .where(inArray(bankMovementJournalEntries.journalEntryId, journalEntryIds));

    expect(entryRows).toEqual([]);
    expect(postingRows).toEqual([]);
    expect(invoiceLinks).toEqual([]);
    expect(periodLinks).toEqual([]);
    expect(movementLinks).toEqual([]);
  });

  test("deletes its clients, invoices and lines", async () => {
    const clientRows = await db
      .select()
      .from(clients)
      .where(eq(clients.organizationId, organizationId));
    const invoiceRows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId));
    const lineRows = await db.select().from(lines).where(eq(lines.invoiceId, invoiceId));

    expect(clientRows).toEqual([]);
    expect(invoiceRows).toEqual([]);
    expect(lineRows).toEqual([]);
  });

  test("deletes its bank movements and accounts", async () => {
    const movementRows = await db
      .select()
      .from(bankMovements)
      .where(eq(bankMovements.organizationId, organizationId));
    const accountRows = await db
      .select()
      .from(accounts)
      .where(eq(accounts.organizationId, organizationId));

    expect(movementRows).toEqual([]);
    expect(accountRows).toEqual([]);
  });

  test("deletes its migrations and their datasets", async () => {
    const migrationRows = await db
      .select()
      .from(migrations)
      .where(eq(migrations.organizationId, organizationId));
    const datasetRows = await db
      .select()
      .from(migrationDatasets)
      .where(eq(migrationDatasets.organizationId, organizationId));

    expect(migrationRows).toEqual([]);
    expect(datasetRows).toEqual([]);
  });

  test("keeps another organization and its accounts", async () => {
    const organizationRows = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, otherOrganizationId));
    const accountRows = await db
      .select()
      .from(accounts)
      .where(eq(accounts.organizationId, otherOrganizationId));

    expect(organizationRows).toHaveLength(1);
    expect(accountRows.length).toBeGreaterThan(0);
  });
});
