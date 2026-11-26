import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema, PeriodJournalEntryType } from "@usenullish/nullish-schema/db";
import { DbCollectionPeriodJournal } from "../../../src/ledger/records/period-journal";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";
import { EngineError } from "../../../src/errors";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const LIST_QUERY = {
  pagination: { limit: 100, offset: 0 },
  sort: { field: "createdAt" as const, direction: "asc" as const },
};

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const periodJournalEntries = DbSchema.Ledger.PeriodJournal.PeriodJournalEntriesSchema;

const seedPeriodAndEntry = async (
  organizationId: string,
): Promise<{ periodId: string; journalEntryId: string }> => {
  const [period] = await db
    .insert(periods)
    .values({ organizationId, startOn: new Date("2026-01-01"), endOn: new Date("2026-12-31") })
    .returning();
  assertNonNullish(period);

  const [entry] = await db
    .insert(journalEntries)
    .values({ organizationId, validOn: new Date("2026-06-15"), reference: "TEST" })
    .returning();
  assertNonNullish(entry);

  return { periodId: period.id, journalEntryId: entry.id };
};

const seed = async ({ organizationId }: { organizationId: string }): Promise<string[]> => {
  const { periodId, journalEntryId } = await seedPeriodAndEntry(organizationId);

  const [link] = await db
    .insert(periodJournalEntries)
    .values({ organizationId, periodId, journalEntryId, type: PeriodJournalEntryType.OPENING })
    .returning();
  assertNonNullish(link);

  return [link.id];
};

describe("period journal entries", () => {
  let orgId: string;
  let otherOrgId: string;
  let ids: string[];

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    ids = await seed({ organizationId: orgId });
    await seed({ organizationId: otherOrgId });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("list", () => {
    test("returns only the period journal entries of the organization", async () => {
      const result = await DbCollectionPeriodJournal.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).list(LIST_QUERY);

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.data.map(({ id }) => id).sort()).toEqual([...ids].sort());
    });

    test("returns no period journal entries of an organization the user is not a member of", async () => {
      const result = await DbCollectionPeriodJournal.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: otherOrgId,
      }).list(LIST_QUERY);

      expect(result).toEqual({ status: "success", result: { data: [] } });
    });
  });

  describe("insert", () => {
    test("is not supported", async () => {
      const result = await DbCollectionPeriodJournal.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).insert({
        values: {
          organizationId: orgId,
          periodId: crypto.randomUUID(),
          journalEntryId: crypto.randomUUID(),
          type: PeriodJournalEntryType.OPENING,
        },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(EngineError);
    });
  });
});
