import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  DbSchema,
  InitialSubscriptionStatus,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import { causeMessage, resetDb, seedUsers, TEST_USER_ID } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const organizationRules = DbSchema.Instance.OrganizationRules.OrganizationRulesSchema;

describe("instance.organization_rules", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterEach(async () => {
    await db
      .update(organizationRules)
      .set({ initialSubscriptionStatus: InitialSubscriptionStatus.ACTIVE });
  });

  afterAll(async () => {
    await client.close();
  });

  test("holds a single row starting subscriptions as active", async () => {
    const rows = await db.select().from(organizationRules);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(1);
    expect(rows[0]?.initialSubscriptionStatus).toBe(InitialSubscriptionStatus.ACTIVE);
  });

  test("rejects a second row", async () => {
    const error = await db
      .insert(organizationRules)
      .values({ id: 1 })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_rules_pkey");
  });

  test("rejects a row with another id", async () => {
    const error = await db
      .insert(organizationRules)
      .values({ id: 2 })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_rules_single_row");
  });

  test("rejects deleting the row", async () => {
    const error = await db.delete(organizationRules).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("The organization rules cannot be deleted");
  });

  test("rejects truncating the table", async () => {
    const error = await db
      .execute(sql`TRUNCATE instance.organization_rules`)
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("The organization rules cannot be deleted");
  });

  test("allows starting subscriptions as pending", async () => {
    const [updated] = await db
      .update(organizationRules)
      .set({ initialSubscriptionStatus: InitialSubscriptionStatus.PENDING })
      .returning();

    expect(updated?.initialSubscriptionStatus).toBe(InitialSubscriptionStatus.PENDING);
  });

  test.each([SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELED])(
    "rejects starting subscriptions as %s",
    async (status) => {
      const error = await db
        .execute(
          sql`UPDATE instance.organization_rules SET initial_subscription_status = ${status}`,
        )
        .catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("invalid input value for enum");
    },
  );

  test("cannot be read by a user", async () => {
    const error = await db
      .transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
        await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);
        return tx.select().from(organizationRules);
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("permission denied");
  });
});
