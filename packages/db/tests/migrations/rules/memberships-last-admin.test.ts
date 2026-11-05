import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
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

const addMembership = async ({
  organizationId,
  role,
}: {
  organizationId: string;
  role: "admin" | "accountant" | "reviewer";
}): Promise<string> => {
  const [row] = await db
    .insert(memberships)
    .values({ organizationId, userId: TEST_OTHER_USER_ID, role })
    .returning();
  assertNonNullish(row);
  return row.id;
};

describe("check_memberships_last_admin", () => {
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

  test("rejects changing the role of the last admin", async () => {
    const { id } = await adminMembership(db, organizationId);

    const error = await db
      .update(memberships)
      .set({ role: "accountant" })
      .where(eq(memberships.id, id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("An organization needs at least one admin");
  });

  test("rejects deleting the last admin", async () => {
    const { id } = await adminMembership(db, organizationId);

    const error = await db
      .delete(memberships)
      .where(eq(memberships.id, id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("An organization needs at least one admin");
  });

  test("rejects deleting the last admin while other members remain", async () => {
    const { id } = await adminMembership(db, organizationId);
    await addMembership({ organizationId, role: "accountant" });

    const error = await db
      .delete(memberships)
      .where(eq(memberships.id, id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("An organization needs at least one admin");
  });

  test("allows changing the role of an admin when another admin remains", async () => {
    const { id } = await adminMembership(db, organizationId);
    await addMembership({ organizationId, role: "admin" });

    const [updated] = await db
      .update(memberships)
      .set({ role: "reviewer" })
      .where(eq(memberships.id, id))
      .returning();

    expect(updated?.role).toBe("reviewer");
  });

  test("allows deleting an admin when another admin remains", async () => {
    const { id } = await adminMembership(db, organizationId);
    await addMembership({ organizationId, role: "admin" });

    const deleted = await db.delete(memberships).where(eq(memberships.id, id)).returning();

    expect(deleted).toHaveLength(1);
  });

  test("allows deleting a member who is not an admin", async () => {
    const id = await addMembership({ organizationId, role: "accountant" });

    const deleted = await db.delete(memberships).where(eq(memberships.id, id)).returning();

    expect(deleted).toHaveLength(1);
  });

  test("allows changing the role of a member who is not an admin", async () => {
    const id = await addMembership({ organizationId, role: "reviewer" });

    const [updated] = await db
      .update(memberships)
      .set({ role: "accountant" })
      .where(eq(memberships.id, id))
      .returning();

    expect(updated?.role).toBe("accountant");
  });

  test("allows updating the last admin without changing the role", async () => {
    const { id } = await adminMembership(db, organizationId);

    const [updated] = await db
      .update(memberships)
      .set({ role: "admin" })
      .where(eq(memberships.id, id))
      .returning();

    expect(updated?.role).toBe("admin");
  });
});
