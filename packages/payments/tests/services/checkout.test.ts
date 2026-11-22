import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, MembershipRole, SubscriptionProvider } from "@usenullish/nullish-schema/db";
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

const plans = DbSchema.Subscription.Plans.PlansSchema;
const externalProducts = DbSchema.Subscription.ExternalProducts.ExternalProductsSchema;
const memberships = DbSchema.Core.Memberships.MembershipsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const references = DbSchema.Subscription.SubscriptionReferences.SubscriptionReferencesSchema;
const taxRates = DbSchema.Subscription.SubscriptionTaxRates.SubscriptionTaxRatesSchema;

const instance = await openTestDb();
const db = instance.connection;

describe("CheckoutService", () => {
  const provider = SubscriptionProvider.STRIPE;
  const externalProductId = `prod_${crypto.randomUUID()}`;

  let planId: string;
  let organizationId: string;

  const checkout = ({
    userId = TEST_USER_ID,
    organizationId: checkoutOrganizationId = organizationId,
    externalProductId: checkoutProductId = externalProductId,
    validOn = new Date("2026-06-15"),
  }: {
    userId?: string;
    organizationId?: string;
    externalProductId?: string;
    validOn?: Date;
  } = {}) =>
    CheckoutService.create({ db }).prepare({
      userId,
      organizationId: checkoutOrganizationId,
      provider,
      externalProductId: checkoutProductId,
      validOn,
    });

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);

    await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: MembershipRole.ACCOUNTANT });

    const [plan] = await db.insert(plans).values({ provider }).returning();
    assertNonNullish(plan);
    planId = plan.id;

    await db
      .insert(externalProducts)
      .values({ planId, provider, externalProductId, name: "Cloud" });

    await db.delete(taxRates);
    await db.insert(taxRates).values([
      {
        provider,
        externalTaxRateId: "txr_2025",
        startOn: new Date("2025-01-01"),
        endOn: new Date("2025-12-31"),
      },
      {
        provider,
        externalTaxRateId: "txr_2026",
        startOn: new Date("2026-01-01"),
        endOn: null,
      },
    ]);
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(plans).where(eq(plans.id, planId));
    await db.delete(taxRates);
    await instance.close();
  });

  test("allows an admin to check out a product with a plan", async () => {
    const result = await checkout();

    expect(result.status).toBe("success");
  });

  test("returns the tax rate valid on the date", async () => {
    const result = await checkout({ validOn: new Date("2025-06-15") });

    expect(result).toEqual({ status: "success", result: { externalTaxRateId: "txr_2025" } });
  });

  test("refuses when no tax rate is valid on the date", async () => {
    const result = await checkout({ validOn: new Date("2024-06-15") });

    expect(result.status).toBe("error");
  });

  test("refuses a member who is not an admin", async () => {
    const result = await checkout({ userId: TEST_OTHER_USER_ID });

    expect(result.status).toBe("error");
  });

  test("refuses an organization the user is not a member of", async () => {
    const result = await checkout({ organizationId: TEST_MISSING_ORG_ID });

    expect(result.status).toBe("error");
  });

  test("refuses a product without plan", async () => {
    const result = await checkout({ externalProductId: `prod_${crypto.randomUUID()}` });

    expect(result.status).toBe("error");
  });

  test("refuses a product whose plan has expired", async () => {
    const expiredProductId = `prod_${crypto.randomUUID()}`;
    const [expired] = await db
      .insert(plans)
      .values({ provider, expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .returning();
    assertNonNullish(expired);
    await db.insert(externalProducts).values({
      planId: expired.id,
      provider,
      externalProductId: expiredProductId,
      name: "Expired",
    });

    const result = await checkout({ externalProductId: expiredProductId });

    expect(result.status).toBe("error");

    await db.delete(plans).where(eq(plans.id, expired.id));
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
