import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { sql } from "drizzle-orm";
import { SQL as BunSQL } from "bun";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema } from "@usenullish/nullish-schema/db";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../admin/tests/_test-utils";
import { DbAdminContext } from "../../src";

const organizations = DbSchema.Core.Organizations.OrganizationsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("DbAdminContext", () => {
  let dbContext: DbAdminContext;
  let orgId: string;
  let otherOrgId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    dbContext = await DbAdminContext.open();
  });

  afterAll(async () => {
    await dbContext.close();
    await resetDb(db);
    await client.close();
  });

  describe("exec", () => {
    test("returns the callback's result", async () => {
      const result = await dbContext.exec(async () => 42);

      expect(result).toBe(42);
    });

    test("bypasses row-level security", async () => {
      const rows = await dbContext.exec((tx) => tx.select().from(organizations));

      expect(rows.some((row) => row.id === orgId)).toBeTrue();
      expect(rows.some((row) => row.id === otherOrgId)).toBeTrue();
    });
  });

  describe("execWithUser", () => {
    test("scopes queries to the given user via row-level security", async () => {
      const rows = await dbContext.execWithUser({
        userId: TEST_USER_ID,
        fn: (tx) => tx.select().from(organizations),
      });

      expect(rows.some((row) => row.id === orgId)).toBeTrue();
      expect(rows.some((row) => row.id === otherOrgId)).toBeFalse();
    });

    test("scopes a different call to its own user", async () => {
      const rows = await dbContext.execWithUser({
        userId: TEST_OTHER_USER_ID,
        fn: (tx) => tx.select().from(organizations),
      });

      expect(rows.some((row) => row.id === otherOrgId)).toBeTrue();
      expect(rows.some((row) => row.id === orgId)).toBeFalse();
    });
  });

  describe("execSystem", () => {
    test("executes outside of a transaction", async () => {
      await dbContext.execSystem({ sql: sql`VACUUM` });
    });
  });
});
