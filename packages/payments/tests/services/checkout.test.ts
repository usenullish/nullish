import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { CheckoutService } from "../../src/services/checkout";
import {
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_MISSING_ORG_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../admin/tests/_test-utils";

const claims = DbSchema.Subscription.Claims.ClaimsSchema;
const memberships = DbSchema.Core.Memberships.MembershipsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const references = DbSchema.Subscription.SubscriptionReferences.SubscriptionReferencesSchema;

const instance = await openTestDb();
const db = instance.connection;

describe("CheckoutService", () => {
  const provider = SubscriptionProvider.STRIPE;
  const externalProductId = `prod_${crypto.randomUUID()}`;

  let claimId: string;
  let organizationId: string;

  const checkout = ({
    userId = TEST_USER_ID,
    organizationId: checkoutOrganizationId = organizationId,
    externalProductId: checkoutProductId = externalProductId,
  }: {
    userId?: string;
    organizationId?: string;
    externalProductId?: string;
  } = {}) =>
    CheckoutService.create({ db }).assert({
      userId,
      organizationId: checkoutOrganizationId,
      provider,
      externalProductId: checkoutProductId,
    });

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);

    await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: "accountant" });

    const [claim] = await db.insert(claims).values({ provider, externalProductId }).returning();
    assertNonNullish(claim);
    claimId = claim.id;
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(claims).where(eq(claims.id, claimId));
    await instance.close();
  });

  test("allows an admin to check out a product with a claim", async () => {
    const result = await checkout();

    expect(result.status).toBe("success");
  });

  test("refuses a member who is not an admin", async () => {
    const result = await checkout({ userId: TEST_OTHER_USER_ID });

    expect(result.status).toBe("error");
  });

  test("refuses an organization the user is not a member of", async () => {
    const result = await checkout({ organizationId: TEST_MISSING_ORG_ID });

    expect(result.status).toBe("error");
  });

  test("refuses a product without claim", async () => {
    const result = await checkout({ externalProductId: `prod_${crypto.randomUUID()}` });

    expect(result.status).toBe("error");
  });

  test("refuses an organization already linked to an external subscription", async () => {
    const linkedOrganizationId = await createOrganization(db, TEST_USER_ID);

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, linkedOrganizationId));
    assertNonNullish(subscription);

    await db.insert(references).values({
      subscriptionId: subscription.id,
      provider,
      externalCustomerId: `cus_${crypto.randomUUID()}`,
      externalSubscriptionId: `sub_${crypto.randomUUID()}`,
    });

    const result = await checkout({ organizationId: linkedOrganizationId });

    expect(result.status).toBe("error");
  });
});
