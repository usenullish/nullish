import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { PlansService } from "../../src/services/plans";
import { openTestDb } from "../../../admin/tests/_test-utils";

const claims = DbSchema.Subscription.Claims.ClaimsSchema;

const instance = await openTestDb();
const db = instance.connection;

describe("PlansService", () => {
  const externalProductId = `prod_${crypto.randomUUID()}`;

  let withProductId: string;
  let withoutProductId: string;

  beforeAll(async () => {
    const [withProduct] = await db
      .insert(claims)
      .values({ provider: SubscriptionProvider.STRIPE, externalProductId })
      .returning();
    assertNonNullish(withProduct);
    withProductId = withProduct.id;

    const [withoutProduct] = await db.insert(claims).values({ trialDays: 30 }).returning();
    assertNonNullish(withoutProduct);
    withoutProductId = withoutProduct.id;
  });

  afterAll(async () => {
    await db.delete(claims).where(inArray(claims.id, [withProductId, withoutProductId]));
    await instance.close();
  });

  test("lists the claims linked to a product", async () => {
    const result = await PlansService.create({ db }).listClaims();

    expect(result.status).toBe("success");

    const ids = result.status === "success" ? result.result.map(({ id }) => id) : [];

    expect(ids).toContain(withProductId);
    expect(ids).not.toContain(withoutProductId);
  });
});
