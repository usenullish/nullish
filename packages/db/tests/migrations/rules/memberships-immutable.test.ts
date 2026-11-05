import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createOrganization,
  memberships,
  adminMembership,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_memberships_user_immutable", () => {
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

  test("rejects changing user_id once set", async () => {
    const membership = await adminMembership(db, organizationId);

    const error = await db
      .update(memberships)
      .set({ userId: TEST_OTHER_USER_ID })
      .where(eq(memberships.id, membership.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("user_id cannot be changed once set");
  });

  test("rejects changing organization_id once set", async () => {
    const membership = await adminMembership(db, organizationId);
    const otherOrganizationId = await createOrganization(db);

    const error = await db
      .update(memberships)
      .set({ organizationId: otherOrganizationId })
      .where(eq(memberships.id, membership.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });

  test("allows changing role", async () => {
    const membership = await adminMembership(db, organizationId);

    await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: "admin" });

    const [updated] = await db
      .update(memberships)
      .set({ role: "accountant" })
      .where(eq(memberships.id, membership.id))
      .returning();

    expect(updated?.role).toBe("accountant");
  });
});
