import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { PeriodJournalEntryType } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createJournalEntry,
  createOrganization,
  createPeriod,
  createPeriodJournalEntry,
  periodJournalEntries,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_period_journal_entries_immutable", () => {
  let organizationId: string;
  let periodId: string;
  let journalEntryId: string;

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
    journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));
  });

  test("rejects any update, even a no-op one", async () => {
    const rowId = await createPeriodJournalEntry(db, periodId, journalEntryId);

    const error = await db
      .update(periodJournalEntries)
      .set({ type: PeriodJournalEntryType.OPENING })
      .where(eq(periodJournalEntries.id, rowId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be modified once created");
  });

  test("allows an opening and a result entry for the same period", async () => {
    const otherJournalEntryId = await createJournalEntry(
      db,
      organizationId,
      new Date("2026-01-16"),
    );

    await createPeriodJournalEntry(db, periodId, journalEntryId, PeriodJournalEntryType.OPENING);
    await createPeriodJournalEntry(
      db,
      periodId,
      otherJournalEntryId,
      PeriodJournalEntryType.RESULT,
    );

    const rows = await db
      .select()
      .from(periodJournalEntries)
      .where(eq(periodJournalEntries.periodId, periodId));

    expect(rows).toHaveLength(2);
  });

  test("rejects a second entry of the same type for a period", async () => {
    const otherJournalEntryId = await createJournalEntry(
      db,
      organizationId,
      new Date("2026-01-16"),
    );

    await createPeriodJournalEntry(db, periodId, journalEntryId, PeriodJournalEntryType.OPENING);

    const error = await createPeriodJournalEntry(
      db,
      periodId,
      otherJournalEntryId,
      PeriodJournalEntryType.OPENING,
    ).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("period_journal_entries_period_type_uidx");
  });

  test("rejects linking a journal entry twice", async () => {
    await createPeriodJournalEntry(db, periodId, journalEntryId, PeriodJournalEntryType.OPENING);

    const error = await createPeriodJournalEntry(
      db,
      periodId,
      journalEntryId,
      PeriodJournalEntryType.RESULT,
    ).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("period_journal_entries_journal_entry_id_uidx");
  });
});
