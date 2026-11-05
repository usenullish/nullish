import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { assertNonNullish } from "@usenullish/nullish-common";
import { AccountType, BankMovementStatus, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  bankMovementJournalEntries,
  bankMovements,
  causeMessage,
  createBankRelation,
  createBankMovement,
  createBankStatement,
  createOrganization,
  createPeriod,
  journalEntries,
  leafAccountId,
  postings,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_bank_movement_reconciled", () => {
  let organizationId: string;
  let bankLedgerAccountId: string;
  let counterAccountId: string;
  let bankRelationId: string;
  let bankStatementId: string;

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
    bankLedgerAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);
    counterAccountId = await leafAccountId(db, organizationId, AccountType.EXPENSE);
    bankRelationId = await createBankRelation(db, organizationId, {
      accountId: bankLedgerAccountId,
    });
    bankStatementId = await createBankStatement(db, organizationId, bankRelationId);
  });

  const reconcile = ({
    movementId,
    bankDebit = 0n,
    bankCredit = 0n,
    entryOrganizationId = organizationId,
    link = true,
    status = BankMovementStatus.RECONCILED,
  }: {
    movementId: string;
    bankDebit?: bigint;
    bankCredit?: bigint;
    entryOrganizationId?: string;
    link?: boolean;
    status?: BankMovementStatus;
  }): Promise<void> =>
    db.transaction(async (tx) => {
      const [entry] = await tx
        .insert(journalEntries)
        .values({
          organizationId: entryOrganizationId,
          validOn: new Date("2026-01-15"),
          reference: "Bank movement",
        })
        .returning();
      assertNonNullish(entry);

      const amount = bankDebit + bankCredit;

      await tx.insert(postings).values([
        {
          organizationId: entryOrganizationId,
          journalEntryId: entry.id,
          accountId: bankLedgerAccountId,
          debit: bankDebit,
          credit: bankCredit,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
        },
        {
          organizationId: entryOrganizationId,
          journalEntryId: entry.id,
          accountId: counterAccountId,
          debit: bankCredit,
          credit: bankDebit,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
        },
      ]);

      if (amount > 0n && link) {
        await tx
          .insert(bankMovementJournalEntries)
          .values({ organizationId, movementId, journalEntryId: entry.id });
      }

      await tx.update(bankMovements).set({ status }).where(eq(bankMovements.id, movementId));
    });

  const statusOf = async (movementId: string): Promise<BankMovementStatus | undefined> => {
    const [row] = await db.select().from(bankMovements).where(eq(bankMovements.id, movementId));
    return row?.status;
  };

  test("reconciles money in with an entry debiting the bank ledger account by its amount", async () => {
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
      amount: 1000n,
    });

    await reconcile({ movementId, bankDebit: 1000n });

    expect(await statusOf(movementId)).toBe(BankMovementStatus.RECONCILED);
  });

  test("reconciles money out with an entry crediting the bank ledger account by its amount", async () => {
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
      amount: -1000n,
    });

    await reconcile({ movementId, bankCredit: 1000n });

    expect(await statusOf(movementId)).toBe(BankMovementStatus.RECONCILED);
  });

  test("rejects an entry booking another amount on the bank ledger account", async () => {
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
      amount: 1000n,
    });

    const error = await reconcile({ movementId, bankDebit: 900n }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is reconciled with journal entries booking");
  });

  test("rejects an entry booking the opposite sign on the bank ledger account", async () => {
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
      amount: 1000n,
    });

    const error = await reconcile({ movementId, bankCredit: 1000n }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is reconciled with journal entries booking");
  });

  test("rejects a reconciled movement without journal entry", async () => {
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
    });

    const error = await reconcile({ movementId, bankDebit: 1000n, link: false }).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("is reconciled but linked to no journal entry");
  });

  test("rejects a journal entry linked to a movement that is not reconciled", async () => {
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
    });

    const error = await reconcile({
      movementId,
      bankDebit: 1000n,
      status: BankMovementStatus.UNRECONCILED,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is unreconciled but linked to journal entries");
  });

  test("rejects a journal entry of another organization", async () => {
    const otherOrganizationId = await createOrganization(db);
    await createPeriod(db, otherOrganizationId, { startOn: new Date("2026-01-01") });
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
    });

    const error = await reconcile({
      movementId,
      bankDebit: 1000n,
      entryOrganizationId: otherOrganizationId,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("does not belong to the organization of bank movement");
  });

  test("rejects modifying a link", async () => {
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
    });
    await reconcile({ movementId, bankDebit: 1000n });

    const error = await db
      .update(bankMovementJournalEntries)
      .set({ movementId })
      .where(eq(bankMovementJournalEntries.movementId, movementId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be modified once created");
  });
});
