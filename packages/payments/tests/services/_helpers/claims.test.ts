import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import {
  getClaimByExternalProduct,
  listClaimsWithProduct,
} from "../../../src/services/_helpers/claims";
import { openTestDb } from "../../../../admin/tests/_test-utils";

const claims = DbSchema.Subscription.Claims.ClaimsSchema;

const instance = await openTestDb();
const db = instance.connection;

afterAll(async () => {
  await instance.close();
});

describe("getClaimByExternalProduct", () => {
  const provider = SubscriptionProvider.STRIPE;
  const externalProductId = `prod_${crypto.randomUUID()}`;

  let claimId: string;

  beforeAll(async () => {
    const [claim] = await db.insert(claims).values({ provider, externalProductId }).returning();
    assertNonNullish(claim);
    claimId = claim.id;
  });

  afterAll(async () => {
    await db.delete(claims).where(eq(claims.id, claimId));
  });

  test("returns the claim of the product", async () => {
    const claim = await db.transaction((tx) =>
      getClaimByExternalProduct({ tx, provider, externalProductId }),
    );

    expect(claim.id).toBe(claimId);
    expect(claim.provider).toBe(provider);
    expect(claim.externalProductId).toBe(externalProductId);
  });

  test("throws for a product without claim", async () => {
    await expect(
      db.transaction((tx) =>
        getClaimByExternalProduct({
          tx,
          provider,
          externalProductId: `prod_${crypto.randomUUID()}`,
        }),
      ),
    ).rejects.toThrow();
  });
});

describe("listClaimsWithProduct", () => {
  const provider = SubscriptionProvider.STRIPE;

  let withProductId: string;
  let withoutProductId: string;

  beforeAll(async () => {
    const [withProduct] = await db
      .insert(claims)
      .values({ provider, externalProductId: `prod_${crypto.randomUUID()}` })
      .returning();
    assertNonNullish(withProduct);
    withProductId = withProduct.id;

    const [withoutProduct] = await db.insert(claims).values({ trialDays: 30 }).returning();
    assertNonNullish(withoutProduct);
    withoutProductId = withoutProduct.id;
  });

  afterAll(async () => {
    await db.delete(claims).where(inArray(claims.id, [withProductId, withoutProductId]));
  });

  test("returns the claims linked to a product", async () => {
    const result = await db.transaction((tx) => listClaimsWithProduct({ tx }));

    expect(result.map(({ id }) => id)).toContain(withProductId);
  });

  test("leaves out the claims without product", async () => {
    const result = await db.transaction((tx) => listClaimsWithProduct({ tx }));

    expect(result.map(({ id }) => id)).not.toContain(withoutProductId);
    expect(result.every(({ externalProductId }) => nonNullish(externalProductId))).toBe(true);
  });
});
