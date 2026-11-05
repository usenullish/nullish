import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { AccountType, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { assertNonNullish } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createJournalEntry,
  currencies,
  createOrganization,
  createPeriod,
  leafAccountId,
  postings,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_journal_entry_balance", () => {
  let organizationId: string;
  let journalEntryId: string;
  let debitAccountId: string;
  let creditAccountId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
    await db
      .insert(currencies)
      .values([
        { code: "JPY", decimals: 0 },
        { code: "ETH", decimals: 18 },
      ])
      .onConflictDoNothing();
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

  test("rejects a single one-sided posting at commit", async () => {
    const error = await db
      .insert(postings)
      .values({
        organizationId,
        journalEntryId,
        accountId: debitAccountId,
        description: "lone leg",
        debit: 1000n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("does not balance");
  });

  test("accepts a balanced pair of postings", async () => {
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

  test("rejects an update that unbalances a previously balanced entry", async () => {
    const [debitPosting] = await db.transaction(async (tx) =>
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
    assertNonNullish(debitPosting);

    const error = await db
      .update(postings)
      .set({ debit: 2000n })
      .where(eq(postings.id, debitPosting.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("does not balance");
  });

  test("rejects deleting one leg of a balanced entry", async () => {
    const [debitPosting] = await db.transaction(async (tx) =>
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
    assertNonNullish(debitPosting);

    const error = await db
      .delete(postings)
      .where(eq(postings.id, debitPosting.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("does not balance");
  });

  test("accepts a posting in a currency without decimals balanced by its value in the base currency", async () => {
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
            currency: "JPY",
            exchangeRate: 0.0055,
          },
          {
            organizationId,
            journalEntryId,
            accountId: creditAccountId,
            description: "credit leg",
            credit: 550n,
            currency: "CHF",
            exchangeRate: 1,
          },
        ])
        .returning(),
    );

    expect(rows).toHaveLength(2);
  });

  test("rejects a posting in a currency without decimals whose rate is stated between the smallest units", async () => {
    const error = await db
      .transaction(async (tx) =>
        tx.insert(postings).values([
          {
            organizationId,
            journalEntryId,
            accountId: debitAccountId,
            description: "debit leg",
            debit: 1000n,
            currency: "JPY",
            exchangeRate: 0.55,
          },
          {
            organizationId,
            journalEntryId,
            accountId: creditAccountId,
            description: "credit leg",
            credit: 550n,
            currency: "CHF",
            exchangeRate: 1,
          },
        ]),
      )
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("does not balance");
  });

  test("accepts a posting in a currency with eighteen decimals balanced by its value in the base currency", async () => {
    const rows = await db.transaction(async (tx) =>
      tx
        .insert(postings)
        .values([
          {
            organizationId,
            journalEntryId,
            accountId: debitAccountId,
            description: "debit leg",
            debit: 1000000000000000000n,
            currency: "ETH",
            exchangeRate: 3000,
          },
          {
            organizationId,
            journalEntryId,
            accountId: creditAccountId,
            description: "credit leg",
            credit: 300000n,
            currency: "CHF",
            exchangeRate: 1,
          },
        ])
        .returning(),
    );

    expect(rows).toHaveLength(2);
  });

  test("accepts a posting whose value in the base currency differs by less than its smallest unit", async () => {
    const rows = await db.transaction(async (tx) =>
      tx
        .insert(postings)
        .values([
          {
            organizationId,
            journalEntryId,
            accountId: debitAccountId,
            description: "debit leg",
            debit: 5000000000000n,
            currency: "ETH",
            exchangeRate: 3012.45,
          },
          {
            organizationId,
            journalEntryId,
            accountId: creditAccountId,
            description: "credit leg",
            credit: 2n,
            currency: "CHF",
            exchangeRate: 1,
          },
        ])
        .returning(),
    );

    expect(rows).toHaveLength(2);
  });

  test("rejects a posting whose value in the base currency differs by one smallest unit", async () => {
    const error = await db
      .transaction(async (tx) =>
        tx.insert(postings).values([
          {
            organizationId,
            journalEntryId,
            accountId: debitAccountId,
            description: "debit leg",
            debit: 5000000000000n,
            currency: "ETH",
            exchangeRate: 3012.45,
          },
          {
            organizationId,
            journalEntryId,
            accountId: creditAccountId,
            description: "credit leg",
            credit: 3n,
            currency: "CHF",
            exchangeRate: 1,
          },
        ]),
      )
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("does not balance");
  });

  test("accepts a conversion difference booked in the smallest unit of the base currency", async () => {
    const rows = await db.transaction(async (tx) =>
      tx
        .insert(postings)
        .values([
          {
            organizationId,
            journalEntryId,
            accountId: debitAccountId,
            description: "debit leg",
            debit: 5000000000000n,
            currency: "ETH",
            exchangeRate: 3012.45,
          },
          {
            organizationId,
            journalEntryId,
            accountId: creditAccountId,
            description: "credit leg",
            credit: 1n,
            currency: "CHF",
            exchangeRate: 1,
          },
          {
            organizationId,
            journalEntryId,
            accountId: creditAccountId,
            description: "conversion difference",
            credit: 1n,
            currency: "CHF",
            exchangeRate: 1,
          },
        ])
        .returning(),
    );

    expect(rows).toHaveLength(3);
  });
});
