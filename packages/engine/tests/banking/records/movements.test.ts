import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { BankMovementStatus, DbSchema } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionMovements, DbMovements } from "../../../src/banking/records/movements";
import {
  createBankRelation,
  createBankStatement,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  dedupeHashOf,
} from "../../_test-utils";

const movements = DbSchema.Banking.Movements.MovementsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("movements", () => {
  let bankRelationId: string;
  let otherBankRelationId: string;
  let earlyId: string;
  let lateId: string;
  let ignoredId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    const organizationId = await createOrganization(db, TEST_USER_ID);
    bankRelationId = await createBankRelation(db, organizationId);
    otherBankRelationId = await createBankRelation(db, organizationId, {
      iban: "CH5604835012345678009",
    });

    const statementId = await createBankStatement(db, { organizationId, bankRelationId });
    const otherStatementId = await createBankStatement(db, {
      organizationId,
      bankRelationId: otherBankRelationId,
    });

    const insert = async ({
      accountId,
      accountStatementId,
      bankReference,
      bookedOn,
    }: {
      accountId: string;
      accountStatementId: string;
      bankReference: string;
      bookedOn: Date;
    }): Promise<string> => {
      const [row] = await db
        .insert(movements)
        .values({
          organizationId,
          bankRelationId: accountId,
          statementId: accountStatementId,
          bankReference,
          dedupeHash: dedupeHashOf(bankReference),
          bookedOn,
          amount: 1000n,
          currency: "CHF",
        })
        .returning();

      if (row === undefined) {
        throw new Error("Movement not inserted");
      }

      return row.id;
    };

    earlyId = await insert({
      accountId: bankRelationId,
      accountStatementId: statementId,
      bankReference: "REF-EARLY",
      bookedOn: new Date("2026-10-02"),
    });
    lateId = await insert({
      accountId: bankRelationId,
      accountStatementId: statementId,
      bankReference: "REF-LATE",
      bookedOn: new Date("2026-10-20"),
    });
    ignoredId = await insert({
      accountId: bankRelationId,
      accountStatementId: statementId,
      bankReference: "REF-IGNORED",
      bookedOn: new Date("2026-10-10"),
    });
    await insert({
      accountId: otherBankRelationId,
      accountStatementId: otherStatementId,
      bankReference: "REF-OTHER",
      bookedOn: new Date("2026-10-10"),
    });

    await db
      .update(movements)
      .set({ status: BankMovementStatus.IGNORED })
      .where(eq(movements.id, ignoredId));
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  const list = ({
    userId = TEST_USER_ID,
    filters,
  }: {
    userId?: string;
    filters?: Parameters<DbCollectionMovements["list"]>[0]["filters"];
  }) =>
    DbCollectionMovements.create({ db, userId, foreignKeyId: bankRelationId }).list({
      pagination: { limit: 10, offset: 0 },
      sort: { field: "bookedOn", direction: "asc" },
      filters,
    });

  const ids = (result: Awaited<ReturnType<typeof list>>): string[] =>
    result.status === "success" ? result.result.map(({ id }) => id) : [];

  test("lists the movements of the bank relation only", async () => {
    expect(ids(await list({}))).toEqual([earlyId, ignoredId, lateId]);
  });

  test("filters on the status", async () => {
    expect(ids(await list({ filters: { status: BankMovementStatus.UNRECONCILED } }))).toEqual([
      earlyId,
      lateId,
    ]);
  });

  test("filters on the booking dates", async () => {
    expect(
      ids(
        await list({
          filters: { bookedOnFrom: new Date("2026-10-05"), bookedOnTo: new Date("2026-10-15") },
        }),
      ),
    ).toEqual([ignoredId]);
  });

  test("lists nothing for a user who is not a member of the organization", async () => {
    expect(ids(await list({ userId: TEST_OTHER_USER_ID }))).toEqual([]);
  });

  test("finds a movement", async () => {
    const result = await DbMovements.create({ db, userId: TEST_USER_ID }).find({ pKey: earlyId });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result?.bankReference).toBe("REF-EARLY");
  });

  test("finds nothing for a missing movement", async () => {
    const result = await DbMovements.create({ db, userId: TEST_USER_ID }).find({
      pKey: TEST_MISSING_ID,
    });

    expect(result).toEqual({ status: "success", result: undefined });
  });
});
