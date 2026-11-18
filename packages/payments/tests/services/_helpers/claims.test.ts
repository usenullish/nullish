import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { getClaimByExternalProduct } from "../../../src/services/_helpers/claims";
import { openTestDb } from "../../../../admin/tests/_test-utils";

const claims = DbSchema.Subscription.Claims.ClaimsSchema;

const instance = await openTestDb();
const db = instance.connection;

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
    await instance.close();
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
