import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { AccountType, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createJournalEntry,
  createOrganization,
  createPeriod,
  leafAccountId,
  postings,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_postings_exchange_rate_positive", () => {
  let organizationId: string;
  let journalEntryId: string;
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
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
    journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));
    debitAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);
    creditAccountId = await leafAccountId(db, organizationId, AccountType.EXPENSE);
  });

  test("rejects a zero exchange_rate", async () => {
    const error = await db
      .insert(postings)
      .values({
        organizationId,
        journalEntryId,
        accountId: debitAccountId,
        description: "zero rate",
        debit: 1000n,
        currency: "EUR",
        exchangeRate: 0,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("exchange_rate must be greater than 0");
  });

  test("rejects a negative exchange_rate", async () => {
    const error = await db
      .insert(postings)
      .values({
        organizationId,
        journalEntryId,
        accountId: debitAccountId,
        description: "negative rate",
        debit: 1000n,
        currency: "EUR",
        exchangeRate: -1,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("exchange_rate must be greater than 0");
  });

  test("accepts a balanced entry with a positive exchange_rate", async () => {
    const rows = await db.transaction(async (tx) =>
      tx
        .insert(postings)
        .values([
          {
            organizationId,
            journalEntryId,
            accountId: debitAccountId,
            description: "debit leg",
            debit: 1000n,
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
          },
          {
            organizationId,
            journalEntryId,
            accountId: creditAccountId,
            description: "credit leg",
            credit: 1000n,
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
          },
        ])
        .returning(),
    );

    expect(rows).toHaveLength(2);
  });
});
