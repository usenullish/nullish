import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
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

describe("check_organization_deletable", () => {
  let organizationId: string;

  const setDeletedAt = (deletedAt: Date) =>
    db.update(organizations).set({ deletedAt }).where(eq(organizations.id, organizationId));

  const deleteOrganization = () =>
    db.delete(organizations).where(eq(organizations.id, organizationId)).returning();

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

  test("allows deleting an organization whose deletion date has passed", async () => {
    await setDeletedAt(new Date(Date.now() - DAY_MS));

    const rows = await deleteOrganization();

    expect(rows.map(({ id }) => id)).toEqual([organizationId]);
  });

  test("rejects deleting an organization that is not marked as deleted", async () => {
    const error = await deleteOrganization().catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is not deleted yet");
  });

  test("rejects deleting an organization whose deletion date is still to come", async () => {
    await setDeletedAt(new Date(Date.now() + 10 * DAY_MS));

    const error = await deleteOrganization().catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is not deleted yet");
  });
});
