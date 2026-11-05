import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionBankRelationSummaries } from "../../../src/banking/composites/bank-relation-summaries";
import {
  createBankRelation,
  createBankStatement,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  dedupeHashOf,
} from "../../_test-utils";

const movements = DbSchema.Banking.Movements.MovementsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("DbCollectionBankRelationSummaries", () => {
  let organizationId: string;
  let withMovementsId: string;
  let withoutMovementsId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);
    withMovementsId = await createBankRelation(db, organizationId);
    withoutMovementsId = await createBankRelation(db, organizationId, {
      iban: "CH5604835012345678009",
    });

    const statementId = await createBankStatement(db, {
      organizationId,
      bankRelationId: withMovementsId,
    });

    await db.insert(movements).values(
      ["REF-1", "REF-2"].map((bankReference) => ({
        organizationId,
        bankRelationId: withMovementsId,
        statementId,
        bankReference,
        dedupeHash: dedupeHashOf(bankReference),
        bookedOn: new Date("2026-10-05"),
        amount: 1000n,
        currency: "CHF",
      })),
    );
  });

  afterAll(async () => {
    await resetDb(db);
  });

  const list = (userId: string) =>
    DbCollectionBankRelationSummaries.create({ db, userId, foreignKeyId: organizationId }).list({
      pagination: { limit: 10, offset: 0 },
      sort: { field: "createdAt", direction: "asc" },
    });

  test("lists the bank relations with their number of movements to reconcile", async () => {
    const result = await list(TEST_USER_ID);

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    const unreconciled = new Map(
      result.result.map(({ bankRelation, movements }) => [bankRelation.id, movements.unreconciled]),
    );

    expect(unreconciled).toEqual(
      new Map([
        [withMovementsId, 2],
        [withoutMovementsId, 0],
      ]),
    );
  });

  test("lists nothing for a user who is not a member of the organization", async () => {
    const result = await list(TEST_OTHER_USER_ID);

    expect(result).toEqual({ status: "success", result: [] });
  });
});

describe("DbCollectionBankRelationSummaries balance", () => {
  let organizationId: string;
  let withStatementsId: string;
  let otherWithStatementId: string;
  let withoutStatementId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);
    withStatementsId = await createBankRelation(db, organizationId);
    otherWithStatementId = await createBankRelation(db, organizationId, {
      iban: "CH5604835012345678009",
    });
    withoutStatementId = await createBankRelation(db, organizationId, {
      iban: "CH3908704016075473007",
    });

    await createBankStatement(db, {
      organizationId,
      bankRelationId: withStatementsId,
      endOn: new Date("2026-02-28"),
      closingBalance: 250000n,
    });
    await createBankStatement(db, {
      organizationId,
      bankRelationId: withStatementsId,
      endOn: new Date("2026-01-31"),
      closingBalance: 100000n,
    });
    await createBankStatement(db, {
      organizationId,
      bankRelationId: otherWithStatementId,
      endOn: new Date("2026-01-31"),
      closingBalance: -5000n,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  const balances = async () => {
    const result = await DbCollectionBankRelationSummaries.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: organizationId,
    }).list({
      pagination: { limit: 10, offset: 0 },
      sort: { field: "createdAt", direction: "asc" },
    });

    expect(result.status).toBe("success");
    return new Map(
      result.status === "success"
        ? result.result.map(({ bankRelation, balance }) => [bankRelation.id, balance])
        : [],
    );
  };

  test("returns the closing balance of the latest statement of the bank relation", async () => {
    expect((await balances()).get(withStatementsId)).toEqual({
      amount: 250000n,
      on: new Date("2026-02-28"),
    });
  });

  test("returns the balance of each bank relation from its own statements", async () => {
    expect((await balances()).get(otherWithStatementId)).toEqual({
      amount: -5000n,
      on: new Date("2026-01-31"),
    });
  });

  test("returns no balance for a bank relation without statement", async () => {
    expect((await balances()).get(withoutStatementId)).toBeNull();
  });
});
