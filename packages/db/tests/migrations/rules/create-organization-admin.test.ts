import { LegalForm } from "@usenullish/nullish-schema/db";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createOrganization,
  organizations,
  adminMembership,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("bootstrap_organization_admin", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  test("creates an admin membership for the creating user", async () => {
    const organizationId = await createOrganization(db);

    const membership = await adminMembership(db, organizationId);

    expect(membership.userId).toBe(TEST_USER_ID);
    expect(membership.organizationId).toBe(organizationId);
  });

  test("rejects creating an organization with no authenticated user", async () => {
    const error = await db
      .insert(organizations)
      .values({ name: "No admin org", legalForm: LegalForm.LLC })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("No authenticated user");
  });
});
