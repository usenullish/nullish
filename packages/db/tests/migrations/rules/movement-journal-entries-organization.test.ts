import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { AccountType } from "@usenullish/nullish-schema/db";
import {
  bankMovementJournalEntries,
  causeMessage,
  createBankMovement,
  createBankRelation,
  createBankStatement,
  createJournalEntry,
  createOrganization,
  createPeriod,
  leafAccountId,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_movement_journal_entries_organization", () => {
  let organizationId: string;
  let otherOrganizationId: string;
  let movementId: string;
  let journalEntryId: string;

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
    const bankRelationId = await createBankRelation(db, organizationId, {
      accountId: await leafAccountId(db, organizationId, AccountType.ASSET),
    });
    const statementId = await createBankStatement(db, organizationId, bankRelationId);
    movementId = await createBankMovement(db, { organizationId, bankRelationId, statementId });
    journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-01-15"));

    otherOrganizationId = await createOrganization(db);
  });

  test("rejects a link with another organization than its movement", async () => {
    const error = await db
      .insert(bankMovementJournalEntries)
      .values({ organizationId: otherOrganizationId, movementId, journalEntryId })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "organization_id must match the parent banking.movements",
    );
  });
});
