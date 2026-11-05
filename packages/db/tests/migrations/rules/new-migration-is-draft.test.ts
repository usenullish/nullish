import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { MigrationProvider, MigrationStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createOrganization,
  migrations,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_new_migration_is_draft", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
  });

  test("rejects creating a migration with a non-draft status", async () => {
    const error = await db
      .insert(migrations)
      .values({
        organizationId,
        userId: TEST_USER_ID,
        provider: MigrationProvider.BEXIO,
        status: MigrationStatus.SUCCEEDED,
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("New migrations must be created with status draft");
  });

  test("allows creating a migration with the default draft status", async () => {
    const [row] = await db
      .insert(migrations)
      .values({ organizationId, userId: TEST_USER_ID, provider: MigrationProvider.BEXIO })
      .returning();

    expect(row?.status).toBe(MigrationStatus.DRAFT);
  });
});
