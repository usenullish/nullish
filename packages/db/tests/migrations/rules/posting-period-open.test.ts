import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { AccountType, EXCHANGE_RATE_ONE, PeriodStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createJournalEntry,
  createOrganization,
  createPeriod,
  leafAccountId,
  periods,
  postings,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_posting_period_open", () => {
  let organizationId: string;
  let journalEntryId: string;
  let debitAccountId: string;

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
    journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));
    debitAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);
  });

  test("rejects a posting once the covering period is closed", async () => {
    await db
      .update(periods)
      .set({ status: PeriodStatus.CLOSED })
      .where(eq(periods.organizationId, organizationId));

    const error = await db
      .insert(postings)
      .values({
        organizationId,
        journalEntryId,
        accountId: debitAccountId,
        description: "posting in a closed period",
        debit: 1000n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "belongs to a journal entry in a closed period and cannot be inserted",
    );
  });

  test("rejects a posting once no period covers the entry's date", async () => {
    await db.delete(periods).where(eq(periods.organizationId, organizationId));

    const error = await db
      .insert(postings)
      .values({
        organizationId,
        journalEntryId,
        accountId: debitAccountId,
        description: "posting with no covering period",
        debit: 1000n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("No period covers date");
  });
});
