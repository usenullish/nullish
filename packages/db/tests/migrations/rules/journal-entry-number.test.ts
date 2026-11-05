import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createJournalEntry,
  createOrganization,
  createPeriod,
  journalEntries,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const numberOf = async (journalEntryId: string): Promise<number | undefined> => {
  const [row] = await db
    .select({ number: journalEntries.number })
    .from(journalEntries)
    .where(eq(journalEntries.id, journalEntryId));

  return row?.number;
};

describe("assign_journal_entry_number", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
  });

  test("assigns 1 to the first journal entry of an organization", async () => {
    const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    expect(await numberOf(journalEntryId)).toBe(1);
  });

  test("assigns the next number in the order entries are inserted", async () => {
    await createJournalEntry(db, organizationId, new Date("2026-03-15"));

    const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    expect(await numberOf(journalEntryId)).toBe(2);
  });

  test("numbers each organization separately", async () => {
    const otherOrganizationId = await createOrganization(db);
    await createPeriod(db, otherOrganizationId, { startOn: new Date("2026-01-01") });
    await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    const journalEntryId = await createJournalEntry(
      db,
      otherOrganizationId,
      new Date("2026-01-15"),
    );

    expect(await numberOf(journalEntryId)).toBe(1);
  });

  test("ignores a number provided at insert", async () => {
    const [row] = await db
      .insert(journalEntries)
      .values({ organizationId, validOn: new Date("2026-01-15"), number: 42 })
      .returning();

    expect(row?.number).toBe(1);
  });

  test("does not reuse the number of a deleted entry that is not the last", async () => {
    const deletedId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));
    await createJournalEntry(db, organizationId, new Date("2026-01-15"));
    await db.delete(journalEntries).where(eq(journalEntries.id, deletedId));

    const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    expect(await numberOf(journalEntryId)).toBe(3);
  });

  test("keeps the number when the entry is updated", async () => {
    const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    const [updated] = await db
      .update(journalEntries)
      .set({ reference: "INV-1" })
      .where(eq(journalEntries.id, journalEntryId))
      .returning();

    expect(updated?.number).toBe(1);
  });

  test("rejects changing the number", async () => {
    const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    const error = await db
      .update(journalEntries)
      .set({ number: 7 })
      .where(eq(journalEntries.id, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("number cannot be changed");
  });
});
