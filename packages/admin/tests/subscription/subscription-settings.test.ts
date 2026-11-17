import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { SubscriptionSettingsService } from "../../src/subscription/services/subscription-settings";
import { openTestDb } from "../_test-utils";

const claims = DbSchema.Subscription.Claims.ClaimsSchema;
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;

const instance = await openTestDb();
const db = instance.connection;

const service = SubscriptionSettingsService.create({ db });

describe("SubscriptionSettingsService", () => {
  let initialClaimId: string;
  let otherClaimId: string;

  beforeAll(async () => {
    const [settings] = await db.select().from(subscriptionSettings);
    assertNonNullish(settings);
    initialClaimId = settings.initialClaimId;

    const [claim] = await db.insert(claims).values({ trialDays: 30 }).returning();
    assertNonNullish(claim);
    otherClaimId = claim.id;
  });

  afterEach(async () => {
    await db.update(subscriptionSettings).set({ initialClaimId, graceDays: 7 });
  });

  afterAll(async () => {
    await db.delete(claims).where(eq(claims.id, otherClaimId));
    await instance.close();
  });

  test("reads the settings", async () => {
    const result = await service.get();

    expect(result).toEqual({
      status: "success",
      result: { id: 1, initialClaimId, graceDays: 7 },
    });
  });

  test("changes the initial claim and the grace days", async () => {
    const result = await service.update({
      settings: { initialClaimId: otherClaimId, graceDays: 10 },
    });

    expect(result).toEqual({
      status: "success",
      result: { id: 1, initialClaimId: otherClaimId, graceDays: 10 },
    });
  });

  test("rejects negative grace days", async () => {
    const result = await service.update({ settings: { graceDays: -1 } });

    expect(result.status).toBe("error");
  });
});
