import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  clients,
  createClient,
  createOrganization,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("core.assert_and_apply_audit_fields", () => {
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

  test("increments version and bumps updated_at on a plain update", async () => {
    const clientId = await createClient(db, organizationId);
    const [before] = await db.select().from(clients).where(eq(clients.id, clientId));

    const [after] = await db
      .update(clients)
      .set({ name: "Renamed" })
      .where(eq(clients.id, clientId))
      .returning();

    expect(after?.version).toBe((before?.version ?? 0) + 1);
    expect(after?.updatedAt.getTime()).toBeGreaterThanOrEqual(before?.updatedAt.getTime() ?? 0);
  });

  test("allows an update that sends back the current version", async () => {
    const clientId = await createClient(db, organizationId);

    const [updated] = await db
      .update(clients)
      .set({ name: "Renamed", version: 1 })
      .where(eq(clients.id, clientId))
      .returning();

    expect(updated?.version).toBe(2);
  });

  test("rejects an update that sends back a stale version", async () => {
    const clientId = await createClient(db, organizationId);
    await db.update(clients).set({ name: "First rename" }).where(eq(clients.id, clientId));

    const error = await db
      .update(clients)
      .set({ name: "Second rename", version: 1 })
      .where(eq(clients.id, clientId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("was modified concurrently");
  });
});
