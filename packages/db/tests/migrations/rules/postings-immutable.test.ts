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
  leafAccountId,
  postings,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_postings_journal_entry_immutable", () => {
  let organizationId: string;
  let firstJournalEntryId: string;
  let secondJournalEntryId: string;
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
    firstJournalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));
    secondJournalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-16"));
    debitAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);
    creditAccountId = await leafAccountId(db, organizationId, AccountType.EXPENSE);
  });

  test("rejects moving a posting to a different journal entry", async () => {
    const [debitPosting] = await db.transaction(async (tx) =>
      tx
        .insert(postings)
        .values([
          {
            organizationId,
            journalEntryId: firstJournalEntryId,
            accountId: debitAccountId,
            description: "debit leg",
            debit: 1000n,
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
          },
          {
            organizationId,
            journalEntryId: firstJournalEntryId,
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
      .set({ journalEntryId: secondJournalEntryId })
      .where(eq(postings.id, debitPosting.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("journal_entry_id cannot be changed once set");
  });
});
