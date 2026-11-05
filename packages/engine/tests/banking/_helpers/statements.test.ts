import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { insertNotConflictingNewStatement } from "../../../src/banking/_helpers/statements";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createBankRelation,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../_test-utils";

const statements = DbSchema.Banking.Statements.StatementsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("insertNotConflictingNewStatement", () => {
  let organizationId: string;
  let bankRelationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db, TEST_USER_ID);
    bankRelationId = await createBankRelation(db, organizationId);
  });

  const insert = ({
    bankStatementId,
    accountId = bankRelationId,
  }: {
    bankStatementId: string;
    accountId?: string;
  }) =>
    db.transaction((tx) =>
      insertNotConflictingNewStatement({
        tx,
        values: {
          organizationId,
          bankRelationId: accountId,
          bankMessageId: "MSG-1",
          bankStatementId,
          startOn: new Date("2026-10-01"),
          endOn: new Date("2026-10-31"),
          openingBalance: 500000n,
          closingBalance: 606600n,
          currency: "CHF",
        },
      }),
    );

  test("inserts and returns a new statement", async () => {
    const statement = await insert({ bankStatementId: "STMT-1" });

    expect(statement?.bankRelationId).toBe(bankRelationId);
    expect(statement?.bankStatementId).toBe("STMT-1");
    expect(statement?.openingBalance).toBe(500000n);
    expect(statement?.closingBalance).toBe(606600n);
  });

  test("returns nothing and inserts nothing for a statement the bank relation already has", async () => {
    await insert({ bankStatementId: "STMT-1" });

    const statement = await insert({ bankStatementId: "STMT-1" });

    expect(statement).toBeUndefined();

    const rows = await db
      .select()
      .from(statements)
      .where(eq(statements.bankRelationId, bankRelationId));
    expect(rows).toHaveLength(1);
  });

  test("inserts the same statement for another bank relation", async () => {
    const otherBankRelationId = await createBankRelation(db, organizationId, {
      iban: "CH5604835012345678009",
    });
    await insert({ bankStatementId: "STMT-1" });

    const statement = await insert({ bankStatementId: "STMT-1", accountId: otherBankRelationId });

    expect(statement?.bankRelationId).toBe(otherBankRelationId);
  });
});
