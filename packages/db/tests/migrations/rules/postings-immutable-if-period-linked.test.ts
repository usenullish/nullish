import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { assertNonNullish } from "@usenullish/nullish-common";
import { AccountType, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createJournalEntry,
  createOrganization,
  createPeriod,
  createPeriodJournalEntry,
  leafAccountId,
  postings,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_posting_immutable_if_period_linked", () => {
  let organizationId: string;
  let periodId: string;
  let journalEntryId: string;
  let debitPostingId: string;
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
    periodId = await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
    journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    debitAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);
    creditAccountId = await leafAccountId(db, organizationId, AccountType.EXPENSE);

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
    debitPostingId = debitPosting.id;
  });

  test("allows updating a posting whose journal entry is not linked to a period", async () => {
    const [row] = await db
      .update(postings)
      .set({ description: "manual debit leg" })
      .where(eq(postings.id, debitPostingId))
      .returning();

    expect(row?.description).toBe("manual debit leg");
  });

  test("rejects updating a posting whose journal entry is linked to a period", async () => {
    await createPeriodJournalEntry(db, periodId, journalEntryId);

    const error = await db
      .update(postings)
      .set({ description: "tampered debit leg" })
      .where(eq(postings.id, debitPostingId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "belongs to a journal entry booked by the closing of a period",
    );
  });

  test("rejects deleting a posting whose journal entry is linked to a period", async () => {
    await createPeriodJournalEntry(db, periodId, journalEntryId);

    const error = await db
      .delete(postings)
      .where(eq(postings.id, debitPostingId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "belongs to a journal entry booked by the closing of a period",
    );
  });

  test("allows inserting postings into a journal entry that is not linked to a period", async () => {
    await db.transaction(async (tx) =>
      tx.insert(postings).values([
        {
          organizationId,
          journalEntryId,
          accountId: debitAccountId,
          description: "additional debit leg",
          debit: 500n,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
        },
        {
          organizationId,
          journalEntryId,
          accountId: creditAccountId,
          description: "additional credit leg",
          credit: 500n,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
        },
      ]),
    );

    const rows = await db
      .select()
      .from(postings)
      .where(eq(postings.journalEntryId, journalEntryId));

    expect(rows).toHaveLength(4);
  });

  test("rejects inserting postings into a journal entry linked to a period", async () => {
    await createPeriodJournalEntry(db, periodId, journalEntryId);

    const error = await db
      .transaction(async (tx) =>
        tx.insert(postings).values([
          {
            organizationId,
            journalEntryId,
            accountId: debitAccountId,
            description: "sneaked debit leg",
            debit: 500n,
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
          },
          {
            organizationId,
            journalEntryId,
            accountId: creditAccountId,
            description: "sneaked credit leg",
            credit: 500n,
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
          },
        ]),
      )
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "belongs to a journal entry booked by the closing of a period",
    );
  });
});
