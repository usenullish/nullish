import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { causeMessage, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const claims = DbSchema.Subscription.Claims.ClaimsSchema;

describe("claims provider and external product", () => {
  const claimIds: string[] = [];

  const insertClaims = async (values: (typeof claims.$inferInsert)[]) => {
    const rows = await db.insert(claims).values(values).returning();
    claimIds.push(...rows.map(({ id }) => id));

    return rows;
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterEach(async () => {
    await db.delete(claims).where(inArray(claims.id, claimIds.splice(0)));
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("allows a claim with a provider and an external product", async () => {
    const externalProductId = `prod_${crypto.randomUUID()}`;

    const [claim] = await insertClaims([
      { provider: SubscriptionProvider.STRIPE, externalProductId },
    ]);

    expect(claim?.provider).toBe(SubscriptionProvider.STRIPE);
    expect(claim?.externalProductId).toBe(externalProductId);
  });

  test("allows several claims without provider and external product", async () => {
    const rows = await insertClaims([{}, {}]);

    expect(rows).toHaveLength(2);
  });

  test("rejects a provider without external product", async () => {
    const error = await insertClaims([{ provider: SubscriptionProvider.STRIPE }]).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("claims_provider_external_product");
  });

  test("rejects an external product without provider", async () => {
    const error = await insertClaims([{ externalProductId: `prod_${crypto.randomUUID()}` }]).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("claims_provider_external_product");
  });

  test("rejects two claims with the same product of a provider", async () => {
    const claim = {
      provider: SubscriptionProvider.STRIPE,
      externalProductId: `prod_${crypto.randomUUID()}`,
    };

    await insertClaims([claim]);

    const error = await insertClaims([claim]).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("claims_provider_external_product_uidx");
  });
});
