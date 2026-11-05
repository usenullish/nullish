import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { PeriodStatus } from "@usenullish/nullish-schema/db";
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

describe("check_journal_entry_period_open", () => {
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
  });

  test("rejects a journal entry whose date has no covering period", async () => {
    const error = await createJournalEntry(db, organizationId, new Date("2026-01-15")).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("No period covers date");
  });

  test("rejects a journal entry that falls within a closed period", async () => {
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
      status: PeriodStatus.CLOSED,
    });

    const error = await createJournalEntry(db, organizationId, new Date("2026-01-15")).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("falls within a closed period");
  });

  test("accepts a journal entry that falls within an open period", async () => {
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });

    const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    expect(journalEntryId).toBeDefined();
  });

  test("rejects moving a journal entry to a date with no covering period", async () => {
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
    const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    const error = await db
      .update(journalEntries)
      .set({ validOn: new Date("2025-01-01") })
      .where(eq(journalEntries.id, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("No period covers date");
  });

  test("allows deleting a journal entry within an open period", async () => {
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
    const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    const deleted = await db
      .delete(journalEntries)
      .where(eq(journalEntries.id, journalEntryId))
      .returning();

    expect(deleted).toHaveLength(1);
  });

  test("rejects deleting a journal entry within a closed period", async () => {
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
    const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    await db
      .update(journalEntries)
      .set({ validOn: new Date("2026-01-15") })
      .where(eq(journalEntries.id, journalEntryId));

    await client`UPDATE ledger.periods SET status = 'closed' WHERE organization_id = ${organizationId}`;

    const error = await db
      .delete(journalEntries)
      .where(eq(journalEntries.id, journalEntryId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("falls within a closed period");
  });
});
