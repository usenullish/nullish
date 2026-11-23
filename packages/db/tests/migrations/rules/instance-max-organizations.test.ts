import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  organizations,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const instanceRules = DbSchema.Instance.InstanceRules.InstanceRulesSchema;

describe("check_instance_max_organizations", () => {
  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterEach(async () => {
    await db.delete(instanceRules);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("allows any organization without instance rules", async () => {
    await createOrganization(db);

    expect(await createOrganization(db)).toBeString();
  });

  test("allows any organization without a maximum", async () => {
    await db.insert(instanceRules).values({ maxOrganizations: null });
    await createOrganization(db);

    expect(await createOrganization(db)).toBeString();
  });

  test("allows an organization below the limit", async () => {
    await db.insert(instanceRules).values({ maxOrganizations: 2 });
    await createOrganization(db);

    expect(await createOrganization(db)).toBeString();
  });

  test("rejects an organization once the limit is reached", async () => {
    await db.insert(instanceRules).values({ maxOrganizations: 1 });
    await createOrganization(db);

    const error = await createOrganization(db).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("This instance has reached its limit of 1 organizations");
  });

  test("counts an organization marked as deleted", async () => {
    await db.insert(instanceRules).values({ maxOrganizations: 1 });
    const organizationId = await createOrganization(db);
    await db
      .update(organizations)
      .set({ deletedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .where(eq(organizations.id, organizationId));

    const error = await createOrganization(db).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("This instance has reached its limit of 1 organizations");
  });
});
