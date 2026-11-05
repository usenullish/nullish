import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { DbSchema, MigrationProvider } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createMigration,
  createOrganization,
  migrations,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const users = DbSchema.Auth.Auth.users;

describe("check_migrations_immutable", () => {
  let organizationId: string;
  let migrationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    migrationId = await createMigration(db, organizationId);
  });

  test("rejects changing the user", async () => {
    const error = await db
      .update(migrations)
      .set({ userId: TEST_OTHER_USER_ID })
      .where(eq(migrations.id, migrationId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("user_id cannot be changed once set");
  });

  test("rejects moving the migration to another organization", async () => {
    const otherOrganizationId = await createOrganization(db);

    const error = await db
      .update(migrations)
      .set({ organizationId: otherOrganizationId })
      .where(eq(migrations.id, migrationId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });

  test("keeps the migration without its user when the user is deleted", async () => {
    const [row] = await db
      .insert(migrations)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, provider: MigrationProvider.BEXIO })
      .returning();

    await db.delete(users).where(eq(users.id, TEST_OTHER_USER_ID));

    const [kept] = await db
      .select()
      .from(migrations)
      .where(eq(migrations.id, row?.id ?? ""));

    expect(kept?.userId).toBeNull();
    expect(kept?.organizationId).toBe(organizationId);
  });
});
