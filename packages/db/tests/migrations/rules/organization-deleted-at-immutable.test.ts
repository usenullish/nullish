import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import type { Nullable } from "@usenullish/nullish-common";
import {
  causeMessage,
  createOrganization,
  organizations,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const DAY_MS = 24 * 60 * 60 * 1000;

describe("check_organization_deleted_at_immutable", () => {
  let organizationId: string;

  const setDeletedAt = (deletedAt: Nullable<Date>) =>
    db
      .update(organizations)
      .set({ deletedAt })
      .where(eq(organizations.id, organizationId))
      .returning();

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("allows scheduling the deletion", async () => {
    const deletedAt = new Date(Date.now() + 10 * DAY_MS);

    const [organization] = await setDeletedAt(deletedAt);

    expect(organization?.deletedAt).toEqual(deletedAt);
  });

  test("rejects clearing a scheduled deletion", async () => {
    await setDeletedAt(new Date(Date.now() + 10 * DAY_MS));

    const error = await setDeletedAt(null).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is already scheduled");
  });

  test("rejects moving a scheduled deletion", async () => {
    await setDeletedAt(new Date(Date.now() + 10 * DAY_MS));

    const error = await setDeletedAt(new Date(Date.now() + 20 * DAY_MS)).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is already scheduled");
  });

  test("allows updating another column of an organization whose deletion is scheduled", async () => {
    await setDeletedAt(new Date(Date.now() + 10 * DAY_MS));

    const [organization] = await db
      .update(organizations)
      .set({ name: "Renamed" })
      .where(eq(organizations.id, organizationId))
      .returning();

    expect(organization?.name).toBe("Renamed");
  });
});
