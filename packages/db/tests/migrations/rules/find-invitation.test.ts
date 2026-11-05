import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { causeMessage, resetDb, seedUsers, TEST_OTHER_USER_ID } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("find_invitation", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("cannot be called by a user", async () => {
    const error = await db
      .transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
        await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_OTHER_USER_ID})`);
        return await tx.execute(sql`SELECT * FROM core.find_invitation(${"any"})`);
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("permission denied");
  });
});
