import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { AccountType, DbSchema, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { assertNonNullish } from "@usenullish/nullish-common";
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

const postingManualVatPostings =
  DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema;

describe("check_posting_manual_vat_postings_organization", () => {
  let organizationId: string;
  let otherOrganizationId: string;
  let postingId: string;
  let vatPostingId: string;

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
    const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    const line = {
      organizationId,
      journalEntryId,
      description: "line",
      currency: "CHF",
      exchangeRate: EXCHANGE_RATE_ONE,
    };

    const [debit, credit] = await db
      .insert(postings)
      .values([
        {
          ...line,
          accountId: await leafAccountId(db, organizationId, AccountType.EXPENSE),
          debit: 1000n,
        },
        {
          ...line,
          accountId: await leafAccountId(db, organizationId, AccountType.ASSET),
          credit: 1000n,
        },
      ])
      .returning();
    assertNonNullish(debit);
    assertNonNullish(credit);

    postingId = debit.id;
    vatPostingId = credit.id;

    otherOrganizationId = await createOrganization(db);
  });

  test("rejects a link with another organization than its postings", async () => {
    const error = await db
      .insert(postingManualVatPostings)
      .values({ organizationId: otherOrganizationId, postingId, vatPostingId })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id must match the parent ledger.postings");
  });
});
