import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish, type Nullable } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { causeMessage, resetDb, seedUsers, TEST_USER_ID } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const taxRates = DbSchema.Subscription.SubscriptionTaxRates.SubscriptionTaxRatesSchema;

const asUser = <T>(
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);
    return await fn(tx);
  });

const insertTaxRate = async ({
  startOn,
  endOn,
}: {
  startOn: Date;
  endOn: Nullable<Date>;
}): Promise<string> => {
  const [row] = await db
    .insert(taxRates)
    .values({
      provider: SubscriptionProvider.STRIPE,
      externalTaxRateId: `txr_${crypto.randomUUID()}`,
      startOn,
      endOn,
    })
    .returning();
  assertNonNullish(row);

  return row.id;
};

describe("subscription tax rates", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  beforeEach(async () => {
    await db.delete(taxRates);
  });

  afterAll(async () => {
    await db.delete(taxRates);
    await resetDb(db);
    await client.close();
  });

  test("rejects a rate of a self provider", async () => {
    const error = await db
      .insert(taxRates)
      .values({
        provider: SubscriptionProvider.SELF,
        externalTaxRateId: `txr_${crypto.randomUUID()}`,
        startOn: new Date("2026-01-01"),
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_tax_rates_provider_third_party");
  });

  test("rejects a rate of a custom provider", async () => {
    const error = await db
      .insert(taxRates)
      .values({
        provider: SubscriptionProvider.CUSTOM,
        externalTaxRateId: `txr_${crypto.randomUUID()}`,
        startOn: new Date("2026-01-01"),
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_tax_rates_provider_third_party");
  });

  test("rejects a rate whose range overlaps an existing one", async () => {
    await insertTaxRate({ startOn: new Date("2026-01-01"), endOn: new Date("2026-12-31") });

    const error = await insertTaxRate({
      startOn: new Date("2026-06-01"),
      endOn: new Date("2027-06-30"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_tax_rates_no_overlap");
  });

  test("rejects a rate that starts on the day the previous one ends", async () => {
    await insertTaxRate({ startOn: new Date("2026-01-01"), endOn: new Date("2026-12-31") });

    const error = await insertTaxRate({
      startOn: new Date("2026-12-31"),
      endOn: null,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_tax_rates_no_overlap");
  });

  test("accepts a rate that starts the day after the previous one ends", async () => {
    await insertTaxRate({ startOn: new Date("2026-01-01"), endOn: new Date("2026-12-31") });

    const id = await insertTaxRate({ startOn: new Date("2027-01-01"), endOn: null });

    expect(id).toBeDefined();
  });

  test("rejects a rate after a rate without end", async () => {
    await insertTaxRate({ startOn: new Date("2026-01-01"), endOn: null });

    const error = await insertTaxRate({
      startOn: new Date("2027-01-01"),
      endOn: null,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_tax_rates_no_overlap");
  });

  test("rejects a rate that ends before it starts", async () => {
    const error = await insertTaxRate({
      startOn: new Date("2026-12-31"),
      endOn: new Date("2026-01-01"),
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_tax_rates_end_after_start");
  });

  test("rejects a member reading the tax rates", async () => {
    await insertTaxRate({ startOn: new Date("2026-01-01"), endOn: null });

    const error = await asUser((tx) => tx.select().from(taxRates)).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("permission denied");
  });
});
