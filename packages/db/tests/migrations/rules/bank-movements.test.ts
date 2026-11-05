import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { AccountType, BankMovementStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  bankMovements,
  causeMessage,
  createBankRelation,
  createBankMovement,
  createBankStatement,
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
  dedupeHashOf,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("bank movements", () => {
  let organizationId: string;
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
    bankRelationId = await createBankRelation(db, organizationId, {
      accountId: await leafAccountId(db, organizationId, AccountType.ASSET),
    });
    bankStatementId = await createBankStatement(db, organizationId, bankRelationId);
  });

  const createOtherBankRelation = async (): Promise<string> =>
    createBankRelation(db, organizationId, {
      accountId: await leafAccountId(db, organizationId, AccountType.ASSET),
      iban: "CH5604835012345678009",
    });

  test("inserts an unreconciled movement of the statement", async () => {
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
    });

    const [row] = await db.select().from(bankMovements).where(eq(bankMovements.id, movementId));

    expect(row?.status).toBe(BankMovementStatus.UNRECONCILED);
  });

  test("rejects a movement of a statement of another bank relation", async () => {
    const otherBankRelationId = await createOtherBankRelation();

    const error = await createBankMovement(db, {
      organizationId,
      bankRelationId: otherBankRelationId,
      statementId: bankStatementId,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "does not belong to the bank account and organization of bank movement",
    );
  });

  test("rejects the same dedupe hash twice for the same bank relation", async () => {
    await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
      dedupeHash: dedupeHashOf("BANK-REF-1"),
    });

    const error = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
      dedupeHash: dedupeHashOf("BANK-REF-1"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("movements_bank_relation_dedupe_hash_uidx");
  });

  test("accepts the same dedupe hash for another bank relation", async () => {
    const otherBankRelationId = await createOtherBankRelation();
    const otherStatementId = await createBankStatement(db, organizationId, otherBankRelationId);
    await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
      dedupeHash: dedupeHashOf("BANK-REF-1"),
    });

    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId: otherBankRelationId,
      statementId: otherStatementId,
      dedupeHash: dedupeHashOf("BANK-REF-1"),
    });

    expect(movementId).toBeString();
  });

  test("accepts a movement without bank reference", async () => {
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
      bankReference: null,
    });

    const [row] = await db.select().from(bankMovements).where(eq(bankMovements.id, movementId));

    expect(row?.bankReference).toBeNull();
  });

  test("rejects a dedupe hash that is not a SHA-256", async () => {
    const error = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
      dedupeHash: "not-a-sha-256".padEnd(64, "x"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("movements_dedupe_hash_format");
  });

  test("rejects modifying the dedupe hash", async () => {
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
    });

    const error = await db
      .update(bankMovements)
      .set({ dedupeHash: dedupeHashOf("another") })
      .where(eq(bankMovements.id, movementId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("only its status can change");
  });

  test("rejects a movement of a zero amount", async () => {
    const error = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
      amount: 0n,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("movements_amount_not_zero");
  });

  test("allows ignoring and restoring a movement", async () => {
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
    });

    await db
      .update(bankMovements)
      .set({ status: BankMovementStatus.IGNORED })
      .where(eq(bankMovements.id, movementId));

    const [restored] = await db
      .update(bankMovements)
      .set({ status: BankMovementStatus.UNRECONCILED })
      .where(eq(bankMovements.id, movementId))
      .returning();

    expect(restored?.status).toBe(BankMovementStatus.UNRECONCILED);
  });

  test("rejects modifying what was imported", async () => {
    const movementId = await createBankMovement(db, {
      organizationId,
      bankRelationId,
      statementId: bankStatementId,
    });

    const error = await db
      .update(bankMovements)
      .set({ amount: 2000n })
      .where(eq(bankMovements.id, movementId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("only its status can change");
  });
});
