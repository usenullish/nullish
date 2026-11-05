import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { assertNonNullish } from "@usenullish/nullish-common";
import { AccountType, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
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

describe("migrated journal entries", () => {
  let organizationId: string;
  let debitAccountId: string;
  let creditAccountId: string;
  let journalEntryId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  const bookEntry = (migrated: boolean): Promise<string> =>
    db.transaction(async (tx) => {
      const [entry] = await tx
        .insert(journalEntries)
        .values({ organizationId, validOn: new Date("2026-01-15"), reference: "Bexio", migrated })
        .returning();
      assertNonNullish(entry);

      await tx.insert(postings).values([
        {
          organizationId,
          journalEntryId: entry.id,
          accountId: debitAccountId,
          debit: 1000n,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
        },
        {
          organizationId,
          journalEntryId: entry.id,
          accountId: creditAccountId,
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
    debitAccountId = await leafAccountId(db, organizationId, AccountType.EXPENSE);
    creditAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);

    journalEntryId = await bookEntry(true);
  });

  test("allows booking the postings of a migrated entry in the transaction that creates it", async () => {
    const rows = await db
      .select()
      .from(postings)
      .where(eq(postings.journalEntryId, journalEntryId));

    expect(rows).toHaveLength(2);
  });

  test("allows updating a journal entry that is not migrated", async () => {
    const otherEntryId = await bookEntry(false);

    const [row] = await db
      .update(journalEntries)
      .set({ reference: "Manual entry" })
      .where(eq(journalEntries.id, otherEntryId))
      .returning();

    expect(row?.reference).toBe("Manual entry");
  });

  test("rejects updating a migrated journal entry", async () => {
    const error = await db
      .update(journalEntries)
      .set({ reference: "Changed" })
      .where(eq(journalEntries.id, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is migrated and cannot be modified or deleted");
  });

  test("rejects unmarking a migrated journal entry", async () => {
    const error = await db
      .update(journalEntries)
      .set({ migrated: false })
      .where(eq(journalEntries.id, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is migrated and cannot be modified or deleted");
  });

  test("rejects deleting a migrated journal entry", async () => {
    const error = await db
      .delete(journalEntries)
      .where(eq(journalEntries.id, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is migrated and cannot be modified or deleted");
  });

  test("rejects marking a journal entry as migrated", async () => {
    const otherEntryId = await bookEntry(false);

    const error = await db
      .update(journalEntries)
      .set({ migrated: true })
      .where(eq(journalEntries.id, otherEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be marked as migrated");
  });

  test("rejects modifying a posting of a migrated journal entry", async () => {
    const error = await db
      .update(postings)
      .set({ description: "Changed" })
      .where(eq(postings.journalEntryId, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("belongs to a migrated journal entry");
  });

  test("rejects deleting a posting of a migrated journal entry", async () => {
    const error = await db
      .delete(postings)
      .where(eq(postings.journalEntryId, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("belongs to a migrated journal entry");
  });

  test("rejects adding a posting to a migrated journal entry after its transaction", async () => {
    const error = await db
      .insert(postings)
      .values({
        organizationId,
        journalEntryId,
        accountId: debitAccountId,
        debit: 10n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("belongs to a migrated journal entry");
  });
});
