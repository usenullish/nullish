import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, PeriodJournalEntryType } from "@usenullish/nullish-schema/db";
import { insertPeriodJournalEntry } from "../../../src/ledger/_helpers/period-journal";
import { envDbUrl } from "@usenullish/nullish-env";
import { createOrganization, resetDb, seedUsers, TEST_USER_ID } from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const periodJournalEntries = DbSchema.Ledger.PeriodJournal.PeriodJournalEntriesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("ledger/_helpers/period-journal", () => {
  let orgId: string;
  let periodId: string;
  let journalEntryId: string;

  const seedJournalEntry = async (): Promise<string> => {
    const [row] = await db
      .insert(journalEntries)
      .values({ organizationId: orgId, validOn: new Date("2026-06-15") })
      .returning();
    assertNonNullish(row);
    return row.id;
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    orgId = await createOrganization(db, TEST_USER_ID);

    const [period] = await db
      .insert(periods)
      .values({
        organizationId: orgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      })
      .returning();
    assertNonNullish(period);
    periodId = period.id;

    journalEntryId = await seedJournalEntry();
  });

  describe("insertPeriodJournalEntry", () => {
    test("records the link between the period and the journal entry", async () => {
      await db.transaction((tx) =>
        insertPeriodJournalEntry({
          tx,
          organizationId: orgId,
          periodId,
          journalEntryId,
          entryType: PeriodJournalEntryType.OPENING,
        }),
      );

      const rows = await db
        .select()
        .from(periodJournalEntries)
        .where(eq(periodJournalEntries.periodId, periodId));

      expect(rows).toHaveLength(1);
      expect(rows[0]?.journalEntryId).toBe(journalEntryId);
      expect(rows[0]?.type).toBe(PeriodJournalEntryType.OPENING);
    });

    test("records an opening and a result entry for the same period", async () => {
      const otherJournalEntryId = await seedJournalEntry();

      await db.transaction(async (tx) => {
        await insertPeriodJournalEntry({
          tx,
          organizationId: orgId,
          periodId,
          journalEntryId,
          entryType: PeriodJournalEntryType.OPENING,
        });
        await insertPeriodJournalEntry({
          tx,
          organizationId: orgId,
          periodId,
          journalEntryId: otherJournalEntryId,
          entryType: PeriodJournalEntryType.RESULT,
        });
      });

      const rows = await db
        .select()
        .from(periodJournalEntries)
        .where(eq(periodJournalEntries.periodId, periodId));

      expect(rows.map(({ type }) => type).toSorted()).toEqual([
        PeriodJournalEntryType.OPENING,
        PeriodJournalEntryType.RESULT,
      ]);
    });

    test("rejects a second entry of the same type for the period", async () => {
      const otherJournalEntryId = await seedJournalEntry();

      await db.transaction((tx) =>
        insertPeriodJournalEntry({
          tx,
          organizationId: orgId,
          periodId,
          journalEntryId,
          entryType: PeriodJournalEntryType.OPENING,
        }),
      );

      await expect(
        db.transaction((tx) =>
          insertPeriodJournalEntry({
            tx,
            organizationId: orgId,
            periodId,
            journalEntryId: otherJournalEntryId,
            entryType: PeriodJournalEntryType.OPENING,
          }),
        ),
      ).rejects.toThrow();
    });
  });
});
