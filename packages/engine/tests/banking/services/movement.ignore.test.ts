import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { BankMovementStatus, DbSchema } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { IgnoreMovementService } from "../../../src/banking/services/movement.ignore";
import { EngineError } from "../../../src/errors";
import {
  TEST_MISSING_ID,
  TEST_USER_ID,
  createBankRelation,
  createBankStatement,
  createOrganization,
  randomDedupeHash,
  resetDb,
  seedUsers,
} from "../../_test-utils";

const movements = DbSchema.Banking.Movements.MovementsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("IgnoreMovementService", () => {
  let organizationId: string;
  let bankRelationId: string;
  let statementId: string;

  const ignore = (movementId: string) =>
    IgnoreMovementService.create({ db, userId: TEST_USER_ID, movementId }).ignore();

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
        amount: 1000n,
        currency: "CHF",
      })
      .returning();
    assertNonNullish(row);
    return row.id;
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);
    bankRelationId = await createBankRelation(db, organizationId);
    statementId = await createBankStatement(db, { organizationId, bankRelationId });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("ignores the movement", async () => {
    const movementId = await createMovement();

    const result = await ignore(movementId);

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result.id).toBe(movementId);
    expect(result.result.status).toBe(BankMovementStatus.IGNORED);

    const [row] = await db.select().from(movements).where(eq(movements.id, movementId));
    expect(row?.status).toBe(BankMovementStatus.IGNORED);
  });

  test("returns an error Result for a movement already ignored", async () => {
    const movementId = await createMovement();
    await ignore(movementId);

    const result = await ignore(movementId);

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.err).toBeInstanceOf(EngineError);
  });

  test("returns an error Result for an unknown movement", async () => {
    const result = await ignore(TEST_MISSING_ID);

    expect(result.status).toBe("error");
  });
});
