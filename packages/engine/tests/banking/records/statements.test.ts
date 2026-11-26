import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionStatements } from "../../../src/banking/records/statements";
import { EngineError } from "../../../src/errors";
import {
  createBankRelation,
  createBankStatement,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const LIST_QUERY = {
  pagination: { limit: 100, offset: 0 },
  sort: { field: "createdAt" as const, direction: "asc" as const },
};

const seedStatement = async (organizationId: string): Promise<string> => {
  const bankRelationId = await createBankRelation(db, organizationId);
  return await createBankStatement(db, { organizationId, bankRelationId });
};

describe("statements", () => {
  let orgId: string;
  let otherOrgId: string;
  let statementId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    statementId = await seedStatement(orgId);
    await seedStatement(otherOrgId);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("list", () => {
    test("returns only the statements of the organization", async () => {
      const result = await DbCollectionStatements.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).list(LIST_QUERY);

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.data.map(({ id }) => id)).toEqual([statementId]);
    });

    test("returns no statements of an organization the user is not a member of", async () => {
      const result = await DbCollectionStatements.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: otherOrgId,
      }).list(LIST_QUERY);

      expect(result).toEqual({ status: "success", result: { data: [] } });
    });
  });

  describe("insert", () => {
    test("is not supported", async () => {
      const result = await DbCollectionStatements.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).insert({
        values: {
          organizationId: orgId,
          bankRelationId: crypto.randomUUID(),
          bankMessageId: crypto.randomUUID(),
          bankStatementId: crypto.randomUUID(),
          startOn: new Date("2026-01-01"),
          endOn: new Date("2026-01-31"),
          openingBalance: 0n,
          closingBalance: 0n,
          currency: "CHF",
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
