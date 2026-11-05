import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  accountByCode,
  causeMessage,
  createJournalEntry,
  createOrganization,
  createPeriod,
  postings,
  resetDb,
  seedUsers,
} from "../_test-utils";
import { EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_account_is_leaf", () => {
  let organizationId: string;
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
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
    journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));
  });

  test("rejects a posting against an account that has children", async () => {
    const rootAccount = await accountByCode(db, organizationId, "1");

    const error = await db
      .insert(postings)
      .values({
        organizationId,
        journalEntryId,
        accountId: rootAccount.id,
        description: "posting against a header account",
        debit: 1000n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("has child accounts and cannot receive direct postings");
  });
});
