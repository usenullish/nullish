import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  BankMovementStatus,
  DbSchema,
  EXCHANGE_RATE_ONE,
} from "@usenullish/nullish-schema/db";
import { insertMovementJournalEntry } from "../../../src/banking/_helpers/movement-journal";
import { insertJournal } from "../../../src/ledger/_helpers/journal";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  TEST_USER_ID,
  createBankRelation,
  createBankStatement,
  createOrganization,
  leafAccountId,
  randomDedupeHash,
  resetDb,
  seedUsers,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const bankRelations = DbSchema.Core.Bank.BankRelationsSchema;
const movements = DbSchema.Banking.Movements.MovementsSchema;
const movementJournalEntries = DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("insertMovementJournalEntry", () => {
  let organizationId: string;
  let bankRelationId: string;
  let statementId: string;

  const createOrganizationWithPeriod = async (): Promise<string> => {
    const id = await createOrganization(db, TEST_USER_ID);

    await db.insert(periods).values({
      organizationId: id,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });

    return id;
  };

  const createMovement = async (): Promise<string> => {
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

  const createJournalEntry = async ({
    journalOrganizationId,
    debitAccountId,
  }: {
    journalOrganizationId: string;
    debitAccountId: string;
  }): Promise<string> => {
    const creditAccountId = await leafAccountId(db, journalOrganizationId, AccountType.INCOME);

    const journal = await db.transaction((tx) =>
      insertJournal({
        tx,
        values: {
          entry: {
            organizationId: journalOrganizationId,
            validOn: new Date("2026-10-05"),
            reference: "Bank movement",
          },
          postings: [
            {
              accountId: debitAccountId,
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

  const createBankJournalEntry = async (): Promise<string> => {
    const [bankRelation] = await db
      .select()
      .from(bankRelations)
      .where(eq(bankRelations.id, bankRelationId));
    assertNonNullish(bankRelation);

    return await createJournalEntry({
      journalOrganizationId: organizationId,
      debitAccountId: bankRelation.accountId,
    });
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganizationWithPeriod();
    bankRelationId = await createBankRelation(db, organizationId);
    statementId = await createBankStatement(db, { organizationId, bankRelationId });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("links the movement to the journal entry", async () => {
    const movementId = await createMovement();
    const journalEntryId = await createBankJournalEntry();

    await db.transaction(async (tx) => {
      await insertMovementJournalEntry({ tx, organizationId, movementId, journalEntryId });
      await tx
        .update(movements)
        .set({ status: BankMovementStatus.RECONCILED })
        .where(eq(movements.id, movementId));
    });

    const links = await db
      .select()
      .from(movementJournalEntries)
      .where(eq(movementJournalEntries.movementId, movementId));

    expect(links.map(({ journalEntryId: id }) => id)).toEqual([journalEntryId]);
  });

  test("rejects a link to a movement that is not reconciled", async () => {
    const movementId = await createMovement();
    const journalEntryId = await createBankJournalEntry();

    await expect(
      db.transaction((tx) =>
        insertMovementJournalEntry({ tx, organizationId, movementId, journalEntryId }),
      ),
    ).rejects.toThrow();
  });

  test("rejects a journal entry of another organization", async () => {
    const movementId = await createMovement();
    const otherOrganizationId = await createOrganizationWithPeriod();
    const journalEntryId = await createJournalEntry({
      journalOrganizationId: otherOrganizationId,
      debitAccountId: await leafAccountId(db, otherOrganizationId, AccountType.ASSET),
    });

    await expect(
      db.transaction((tx) =>
        insertMovementJournalEntry({ tx, organizationId, movementId, journalEntryId }),
      ),
    ).rejects.toThrow();
  });
});
