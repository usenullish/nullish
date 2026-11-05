import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { AccountType, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
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

describe("check_postings_organization", () => {
  let organizationId: string;
  let otherOrganizationId: string;
  let journalEntryId: string;
  let debitAccountId: string;
  let creditAccountId: string;

  const balancedPostings = () => [
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
  ];

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
    journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));
    debitAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);
    creditAccountId = await leafAccountId(db, organizationId, AccountType.EXPENSE);

    otherOrganizationId = await createOrganization(db);
  });

  test("accepts postings with the organization of their journal entry", async () => {
    const rows = await db.transaction((tx) =>
      tx.insert(postings).values(balancedPostings()).returning(),
    );

    expect(rows.map((row) => row.organizationId)).toEqual([organizationId, organizationId]);
  });

  test("rejects a posting with another organization than its journal entry", async () => {
    const [debitPosting] = balancedPostings();
    assertNonNullish(debitPosting);

    const error = await db
      .insert(postings)
      .values({ ...debitPosting, organizationId: otherOrganizationId })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "organization_id must match the parent ledger.journal_entries",
    );
  });

  test("rejects changing the organization of a posting", async () => {
    const [row] = await db.transaction((tx) =>
      tx.insert(postings).values(balancedPostings()).returning(),
    );
    assertNonNullish(row);

    const error = await db
      .update(postings)
      .set({ organizationId: otherOrganizationId })
      .where(eq(postings.id, row.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "organization_id must match the parent ledger.journal_entries",
    );
  });
});
