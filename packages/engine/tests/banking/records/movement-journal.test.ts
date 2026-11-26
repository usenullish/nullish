import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  AccountType,
  BankMovementStatus,
  DbSchema,
  EXCHANGE_RATE_ONE,
} from "@usenullish/nullish-schema/db";
import { DbCollectionMovementJournal } from "../../../src/banking/records/movement-journal";
import { insertJournal } from "../../../src/ledger/_helpers/journal";
import { EngineError } from "../../../src/errors";
import {
  createBankRelation,
  createBankStatement,
  createOrganization,
  leafAccountId,
  randomDedupeHash,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const bankRelations = DbSchema.Core.Bank.BankRelationsSchema;
const movements = DbSchema.Banking.Movements.MovementsSchema;
const movementJournalEntries = DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema;

const LIST_QUERY = {
  pagination: { limit: 100, offset: 0 },
  sort: { field: "createdAt" as const, direction: "asc" as const },
};

const seedMovement = async ({
  organizationId,
  bankRelationId,
}: {
  organizationId: string;
  bankRelationId: string;
}): Promise<string> => {
  const statementId = await createBankStatement(db, { organizationId, bankRelationId });

  const [row] = await db
    .insert(movements)
    .values({
      organizationId,
      bankRelationId,
      statementId,
      bankReference: crypto.randomUUID(),
      dedupeHash: randomDedupeHash(),
      bookedOn: new Date("2026-10-05"),
      amount: 10000n,
      currency: "CHF",
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

const seedBankJournalEntry = async ({
  organizationId,
  bankRelationId,
}: {
  organizationId: string;
  bankRelationId: string;
}): Promise<string> => {
  const [bankRelation] = await db
    .select()
    .from(bankRelations)
    .where(eq(bankRelations.id, bankRelationId));
  assertNonNullish(bankRelation);

  const creditAccountId = await leafAccountId(db, organizationId, AccountType.INCOME);

  const journal = await db.transaction((tx) =>
    insertJournal({
      tx,
      values: {
        entry: {
          organizationId,
          validOn: new Date("2026-10-05"),
          reference: "Bank movement",
        },
        postings: [
          {
            accountId: bankRelation.accountId,
            description: null,
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
            vatRateId: null,
            debit: 10000n,
            credit: 0n,
          },
          {
            accountId: creditAccountId,
            description: null,
            currency: "CHF",
            exchangeRate: EXCHANGE_RATE_ONE,
            vatRateId: null,
            debit: 0n,
            credit: 10000n,
          },
        ],
      },
    }),
  );

  return journal.entry.id;
};

const seed = async ({ organizationId }: { organizationId: string }): Promise<string[]> => {
  await db.insert(periods).values({
    organizationId,
    startOn: new Date("2026-01-01"),
    endOn: new Date("2026-12-31"),
  });

  const bankRelationId = await createBankRelation(db, organizationId);
  const movementId = await seedMovement({ organizationId, bankRelationId });
  const journalEntryId = await seedBankJournalEntry({ organizationId, bankRelationId });

  const link = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(movementJournalEntries)
      .values({ organizationId, movementId, journalEntryId })
      .returning();

    await tx
      .update(movements)
      .set({ status: BankMovementStatus.RECONCILED })
      .where(eq(movements.id, movementId));

    return row;
  });
  assertNonNullish(link);

  return [link.id];
};

describe("movement journal entries", () => {
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
    test("returns only the movement journal entries of the organization", async () => {
      const result = await DbCollectionMovementJournal.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).list(LIST_QUERY);

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.data.map(({ id }) => id)).toEqual(ids);
    });

    test("returns no movement journal entries of an organization the user is not a member of", async () => {
      const result = await DbCollectionMovementJournal.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: otherOrgId,
      }).list(LIST_QUERY);

      expect(result).toEqual({ status: "success", result: { data: [] } });
    });
  });

  describe("insert", () => {
    test("is not supported", async () => {
      const result = await DbCollectionMovementJournal.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).insert({
        values: {
          organizationId: orgId,
          movementId: crypto.randomUUID(),
          journalEntryId: crypto.randomUUID(),
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
