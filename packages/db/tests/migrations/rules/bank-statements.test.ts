import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { AccountType } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  bankStatements,
  causeMessage,
  createBankRelation,
  createBankStatement,
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("bank statements", () => {
  let organizationId: string;
  let bankRelationId: string;

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
  });

  test("inserts a statement of a bank relation of the organization", async () => {
    const statementId = await createBankStatement(db, organizationId, bankRelationId);

    const [row] = await db.select().from(bankStatements).where(eq(bankStatements.id, statementId));

    expect(row?.bankRelationId).toBe(bankRelationId);
  });

  test("rejects a statement of a bank relation of another organization", async () => {
    const otherOrganizationId = await createOrganization(db);

    const error = await createBankStatement(db, otherOrganizationId, bankRelationId).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("does not belong to the organization of bank statement");
  });

  test("rejects the same statement twice for the same bank relation", async () => {
    await createBankStatement(db, organizationId, bankRelationId, { bankStatementId: "STMT-1" });

    const error = await createBankStatement(db, organizationId, bankRelationId, {
      bankStatementId: "STMT-1",
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("statements_bank_relation_bank_statement_uidx");
  });

  test("accepts the same statement for another bank relation", async () => {
    const otherBankRelationId = await createBankRelation(db, organizationId, {
      accountId: await leafAccountId(db, organizationId, AccountType.ASSET),
      iban: "CH5604835012345678009",
    });
    await createBankStatement(db, organizationId, bankRelationId, { bankStatementId: "STMT-1" });

    const statementId = await createBankStatement(db, organizationId, otherBankRelationId, {
      bankStatementId: "STMT-1",
    });

    expect(statementId).toBeString();
  });

  test("rejects a period ending before it starts", async () => {
    const error = await db
      .insert(bankStatements)
      .values({
        organizationId,
        bankRelationId,
        bankMessageId: "message",
        bankStatementId: "statement",
        startOn: new Date("2026-02-01"),
        endOn: new Date("2026-01-31"),
        openingBalance: 0n,
        closingBalance: 0n,
        currency: "CHF",
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("statements_period");
  });

  test("rejects modifying a statement", async () => {
    const statementId = await createBankStatement(db, organizationId, bankRelationId);

    const error = await db
      .update(bankStatements)
      .set({ closingBalance: 2000n })
      .where(eq(bankStatements.id, statementId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("cannot be modified once created");
  });
});
