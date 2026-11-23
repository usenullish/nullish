import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema, MembershipRole } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  memberships,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const instanceRules = DbSchema.Instance.InstanceRules.InstanceRulesSchema;

describe("check_instance_max_members", () => {
  let organizationId: string;

  const insertMember = () =>
    db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: MembershipRole.ACCOUNTANT })
      .returning();

  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
    organizationId = await createOrganization(db);
  });

  afterEach(async () => {
    await db.delete(instanceRules);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("allows any member without instance rules", async () => {
    const rows = await insertMember();

    expect(rows).toHaveLength(1);
  });

  test("allows any member without a maximum", async () => {
    await db.insert(instanceRules).values({ maxMembers: null });

    const rows = await insertMember();

    expect(rows).toHaveLength(1);
  });

  test("allows a member below the limit", async () => {
    await db.insert(instanceRules).values({ maxMembers: 2 });

    const rows = await insertMember();

    expect(rows).toHaveLength(1);
  });

  test("rejects a new member once the limit is reached", async () => {
    await db.insert(instanceRules).values({ maxMembers: 1 });

    const error = await insertMember().catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("This instance has reached its limit of 1 members");
  });

  test("lets a member join another organization once the limit is reached", async () => {
    await db.insert(instanceRules).values({ maxMembers: 1 });

    expect(await createOrganization(db)).toBeString();
  });
});
