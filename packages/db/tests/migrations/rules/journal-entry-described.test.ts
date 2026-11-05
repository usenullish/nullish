import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  BankMovementStatus,
  EXCHANGE_RATE_ONE,
  InvoiceJournalEntryType,
  PeriodJournalEntryType,
} from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  bankMovementJournalEntries,
  bankMovements,
  causeMessage,
  createBankRelation,
  createBankMovement,
  createBankStatement,
  createClient,
  createDraftInvoice,
  createOrganization,
  createPeriod,
  invoiceJournalEntries,
  journalEntries,
  leafAccountId,
  periodJournalEntries,
  postings,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const REJECTION = "needs a reference or at least one posting with a description";

describe("check_journal_entry_described", () => {
  let organizationId: string;
  let periodId: string;
  let debitAccountId: string;
  let creditAccountId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    periodId = await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });

    debitAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);
    creditAccountId = await leafAccountId(db, organizationId, AccountType.EXPENSE);
  });

  const createJournal = ({
    reference = null,
    descriptions = [null, null],
    invoiceId,
    linkedPeriodId,
    movementId,
  }: {
    reference?: string | null;
    descriptions?: [string | null, string | null];
    invoiceId?: string;
    linkedPeriodId?: string;
    movementId?: string;
  }): Promise<string> =>
    db.transaction(async (tx) => {
      const [entry] = await tx
        .insert(journalEntries)
        .values({ organizationId, validOn: new Date("2026-01-15"), reference })
        .returning();
      assertNonNullish(entry);

      const [debitDescription, creditDescription] = descriptions;

      await tx.insert(postings).values([
        {
          organizationId,
          journalEntryId: entry.id,
          accountId: debitAccountId,
          description: debitDescription,
          debit: 1000n,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
        },
        {
          organizationId,
          journalEntryId: entry.id,
          accountId: creditAccountId,
          description: creditDescription,
          credit: 1000n,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
        },
      ]);

      if (invoiceId !== undefined) {
        await tx.insert(invoiceJournalEntries).values({
          organizationId,
          invoiceId,
          journalEntryId: entry.id,
          type: InvoiceJournalEntryType.OPEN,
        });
      }

      if (linkedPeriodId !== undefined) {
        await tx.insert(periodJournalEntries).values({
          organizationId,
          periodId: linkedPeriodId,
          journalEntryId: entry.id,
          type: PeriodJournalEntryType.OPENING,
        });
      }

      if (movementId !== undefined) {
        await tx
          .insert(bankMovementJournalEntries)
          .values({ organizationId, movementId, journalEntryId: entry.id });
        await tx
          .update(bankMovements)
          .set({ status: BankMovementStatus.RECONCILED })
          .where(eq(bankMovements.id, movementId));
      }

      return entry.id;
    });

  const createInvoice = async (): Promise<string> => {
    const clientId = await createClient(db, organizationId);
    return await createDraftInvoice(db, organizationId, clientId);
  };

  const createMovement = async (): Promise<string> => {
    const bankRelationId = await createBankRelation(db, organizationId, {
      accountId: debitAccountId,
    });
    const statementId = await createBankStatement(db, organizationId, bankRelationId);

    return await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId,
      amount: 1000n,
    });
  };

  test("accepts an entry with a reference and no posting description", async () => {
    const journalEntryId = await createJournal({ reference: "INV-2026-001" });

    const rows = await db
      .select()
      .from(postings)
      .where(eq(postings.journalEntryId, journalEntryId));

    expect(rows).toHaveLength(2);
  });

  test("accepts an entry without a reference when one posting has a description", async () => {
    const journalEntryId = await createJournal({ descriptions: ["Office rent", null] });

    const rows = await db
      .select()
      .from(postings)
      .where(eq(postings.journalEntryId, journalEntryId));

    expect(rows.map(({ description }) => description)).toContain("Office rent");
  });

  test("rejects an entry without a reference nor a posting description", async () => {
    const error = await createJournal({}).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(REJECTION);
  });

  test("rejects an entry whose reference and posting descriptions are blank", async () => {
    const error = await createJournal({ reference: "  ", descriptions: ["", "   "] }).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain(REJECTION);
  });

  test("accepts an entry without a reference nor a description when it is linked to an invoice", async () => {
    const invoiceId = await createInvoice();

    const journalEntryId = await createJournal({ invoiceId });

    const [link] = await db
      .select()
      .from(invoiceJournalEntries)
      .where(eq(invoiceJournalEntries.journalEntryId, journalEntryId));

    expect(link?.invoiceId).toBe(invoiceId);
  });

  test("rejects clearing the reference of an entry without a posting description", async () => {
    const journalEntryId = await createJournal({ reference: "INV-2026-001" });

    const error = await db
      .update(journalEntries)
      .set({ reference: null })
      .where(eq(journalEntries.id, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(REJECTION);
  });

  test("allows clearing the reference of an entry with a posting description", async () => {
    const journalEntryId = await createJournal({
      reference: "INV-2026-001",
      descriptions: ["Office rent", null],
    });

    const [row] = await db
      .update(journalEntries)
      .set({ reference: null })
      .where(eq(journalEntries.id, journalEntryId))
      .returning();

    expect(row?.reference).toBeNull();
  });

  test("rejects clearing the last posting description of an entry without a reference", async () => {
    const journalEntryId = await createJournal({ descriptions: ["Office rent", null] });

    const error = await db
      .update(postings)
      .set({ description: null })
      .where(eq(postings.journalEntryId, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(REJECTION);
  });

  test("rejects removing the invoice link of an entry without a reference nor a description", async () => {
    const invoiceId = await createInvoice();
    const journalEntryId = await createJournal({ invoiceId });

    const error = await db
      .delete(invoiceJournalEntries)
      .where(eq(invoiceJournalEntries.journalEntryId, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(REJECTION);
  });

  test("accepts an entry without a reference nor a description when it is linked to a period", async () => {
    const journalEntryId = await createJournal({ linkedPeriodId: periodId });

    const [link] = await db
      .select()
      .from(periodJournalEntries)
      .where(eq(periodJournalEntries.journalEntryId, journalEntryId));

    expect(link?.periodId).toBe(periodId);
  });

  test("rejects removing the period link of an entry without a reference nor a description", async () => {
    const journalEntryId = await createJournal({ linkedPeriodId: periodId });

    const error = await db
      .delete(periodJournalEntries)
      .where(eq(periodJournalEntries.journalEntryId, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(REJECTION);
  });

  test("accepts an entry without a reference nor a description when it is linked to a bank movement", async () => {
    const movementId = await createMovement();

    const journalEntryId = await createJournal({ movementId });

    const [link] = await db
      .select()
      .from(bankMovementJournalEntries)
      .where(eq(bankMovementJournalEntries.journalEntryId, journalEntryId));

    expect(link?.movementId).toBe(movementId);
  });

  test("rejects removing the bank movement link of an entry without a reference nor a description", async () => {
    const movementId = await createMovement();
    const journalEntryId = await createJournal({ movementId });

    const error = await db
      .transaction(async (tx) => {
        await tx
          .delete(bankMovementJournalEntries)
          .where(eq(bankMovementJournalEntries.journalEntryId, journalEntryId));
        await tx
          .update(bankMovements)
          .set({ status: BankMovementStatus.UNRECONCILED })
          .where(eq(bankMovements.id, movementId));
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(REJECTION);
  });

  test("allows removing every posting of an entry without a reference", async () => {
    const journalEntryId = await createJournal({ descriptions: ["Office rent", null] });

    await db.delete(postings).where(eq(postings.journalEntryId, journalEntryId));

    const rows = await db
      .select()
      .from(postings)
      .where(eq(postings.journalEntryId, journalEntryId));

    expect(rows).toHaveLength(0);
  });
});
