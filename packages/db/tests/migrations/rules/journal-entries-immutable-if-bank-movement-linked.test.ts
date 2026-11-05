import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { assertNonNullish } from "@usenullish/nullish-common";
import { AccountType, BankMovementStatus, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  bankMovementJournalEntries,
  bankMovements,
  causeMessage,
  createBankRelation,
  createBankMovement,
  createBankStatement,
  createOrganization,
  createPeriod,
  journalEntries,
  leafAccountId,
  postings,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("journal entries reconciled with a bank movement", () => {
  let organizationId: string;
  let bankLedgerAccountId: string;
  let counterAccountId: string;
  let journalEntryId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  const bookEntry = (): Promise<string> =>
    db.transaction(async (tx) => {
      const [entry] = await tx
        .insert(journalEntries)
        .values({ organizationId, validOn: new Date("2026-01-15"), reference: "Bank movement" })
        .returning();
      assertNonNullish(entry);

      await tx.insert(postings).values([
        {
          organizationId,
          journalEntryId: entry.id,
          accountId: bankLedgerAccountId,
          debit: 1000n,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
        },
        {
          organizationId,
          journalEntryId: entry.id,
          accountId: counterAccountId,
          credit: 1000n,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
        },
      ]);

      return entry.id;
    });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
    bankLedgerAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);
    counterAccountId = await leafAccountId(db, organizationId, AccountType.EXPENSE);
    const bankRelationId = await createBankRelation(db, organizationId, {
      accountId: bankLedgerAccountId,
    });
    const bankStatementId = await createBankStatement(db, organizationId, bankRelationId);
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
    });

    journalEntryId = await bookEntry();

    await db.transaction(async (tx) => {
      await tx
        .insert(bankMovementJournalEntries)
        .values({ organizationId, movementId, journalEntryId });
      await tx
        .update(bankMovements)
        .set({ status: BankMovementStatus.RECONCILED })
        .where(eq(bankMovements.id, movementId));
    });
  });

  test("allows updating a journal entry that is not reconciled", async () => {
    const otherEntryId = await bookEntry();

    const [row] = await db
      .update(journalEntries)
      .set({ reference: "Manual entry" })
      .where(eq(journalEntries.id, otherEntryId))
      .returning();

    expect(row?.reference).toBe("Manual entry");
  });

  test("rejects updating a reconciled journal entry", async () => {
    const error = await db
      .update(journalEntries)
      .set({ reference: "Changed" })
      .where(eq(journalEntries.id, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is reconciled with a bank movement");
  });

  test("rejects deleting a reconciled journal entry", async () => {
    const error = await db
      .delete(journalEntries)
      .where(eq(journalEntries.id, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is reconciled with a bank movement");
  });

  test("rejects modifying a posting of a reconciled journal entry", async () => {
    const error = await db
      .update(postings)
      .set({ description: "Changed" })
      .where(eq(postings.journalEntryId, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("reconciled with a bank movement");
  });

  test("rejects adding a posting to a reconciled journal entry", async () => {
    const error = await db
      .insert(postings)
      .values({
        organizationId,
        journalEntryId,
        accountId: counterAccountId,
        debit: 10n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("reconciled with a bank movement");
  });
});
