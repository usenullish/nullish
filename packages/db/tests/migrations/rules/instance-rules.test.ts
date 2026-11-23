import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { causeMessage } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const instanceRules = DbSchema.Instance.InstanceRules.InstanceRulesSchema;

describe("instance_rules", () => {
  afterEach(async () => {
    await db.delete(instanceRules);
  });

  afterAll(async () => {
    await client.close();
  });

  test("allows rules without any maximum", async () => {
    const [rules] = await db.insert(instanceRules).values({}).returning();

    expect(rules).toEqual({ id: 1, maxOrganizations: null, maxMembers: null });
  });

  test("allows rules with one organization and one member", async () => {
    const [rules] = await db
      .insert(instanceRules)
      .values({ maxOrganizations: 1, maxMembers: 1 })
      .returning();

    expect(rules).toEqual({ id: 1, maxOrganizations: 1, maxMembers: 1 });
  });

  test("rejects a second row", async () => {
    await db.insert(instanceRules).values({});

    const error = await db
      .insert(instanceRules)
      .values({ id: 2 })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("instance_rules_single_row");
  });

  test.each([0, -1])("rejects rules with %d organizations", async (maxOrganizations) => {
    const error = await db
      .insert(instanceRules)
      .values({ maxOrganizations })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("instance_rules_max_organizations_positive");
  });

  test.each([0, -1])("rejects rules with %d members", async (maxMembers) => {
    const error = await db
      .insert(instanceRules)
      .values({ maxMembers })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("instance_rules_max_members_positive");
  });
});
