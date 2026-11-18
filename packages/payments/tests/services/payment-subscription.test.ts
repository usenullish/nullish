import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbAdminContext } from "@usenullish/nullish-db";
import { DbSchema, SubscriptionProvider, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import type { Payments } from "@usenullish/nullish-schema/payments";
import { PaymentSubscriptionService } from "../../src/services/payment-subscription";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ORG_ID,
  TEST_USER_ID,
} from "../../../admin/tests/_test-utils";

const claims = DbSchema.Subscription.Claims.ClaimsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const references = DbSchema.Subscription.SubscriptionReferences.SubscriptionReferencesSchema;

const dbContext = await DbAdminContext.open();
const db = dbContext.connection;

const sync = ({ payment }: { payment: Payments["Payment"] }) =>
  PaymentSubscriptionService.create({ db: dbContext }).sync({ payment });

const DAY_MS = 24 * 60 * 60 * 1000;

describe("PaymentSubscriptionService", () => {
  const externalProductId = `prod_${crypto.randomUUID()}`;
  const provider = SubscriptionProvider.STRIPE;

  let claimId: string;
  let organizationId: string;

  const paymentOf = (payment: Partial<Payments["Payment"]> = {}): Payments["Payment"] => ({
    organizationId,
    provider,
    externalIds: {
      subscriptionId: `sub_${crypto.randomUUID()}`,
      customerId: `cus_${crypto.randomUUID()}`,
      productId: externalProductId,
    },
    status: SubscriptionStatus.ACTIVE,
    periodEnd: new Date(Date.now() + 30 * DAY_MS),
    ...payment,
  });

  const subscriptionOf = async (id: string = organizationId) => {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, id));
    assertNonNullish(subscription);

    return subscription;
  };

  const referencesOf = async () => {
    const { id } = await subscriptionOf();

    return db.select().from(references).where(eq(references.subscriptionId, id));
  };

  const expireClaim = () =>
    db
      .update(claims)
      .set({ expiresAt: new Date(Date.now() - DAY_MS) })
      .where(eq(claims.id, claimId));

  beforeAll(async () => {
    const [claim] = await db.insert(claims).values({ provider, externalProductId }).returning();
    assertNonNullish(claim);
    claimId = claim.id;
  });

  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
    await db.update(claims).set({ expiresAt: null }).where(eq(claims.id, claimId));

    organizationId = await createOrganization(db, TEST_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(claims).where(eq(claims.id, claimId));
    await dbContext.close();
  });

  describe("with an organization", () => {
    test("updates the subscription with the claim of the product", async () => {
      const payment = paymentOf();

      const result = await sync({ payment });

      const subscription = await subscriptionOf();

      expect(result).toEqual({ status: "success", result: subscription });
      expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
      expect(subscription.claimId).toBe(claimId);
      expect(subscription.periodEnd).toEqual(payment.periodEnd ?? null);
    });

    test("stores the external references", async () => {
      const payment = paymentOf();

      await sync({ payment });

      const rows = await referencesOf();

      expect(rows).toHaveLength(1);
      expect(rows[0]?.provider).toBe(provider);
      expect(rows[0]?.externalCustomerId).toBe(payment.externalIds.customerId);
      expect(rows[0]?.externalSubscriptionId).toBe(payment.externalIds.subscriptionId);
    });

    test("accepts the same external subscription again", async () => {
      const payment = paymentOf();

      await sync({ payment });

      const result = await sync({ payment });

      expect(result.status).toBe("success");
      expect(await referencesOf()).toHaveLength(1);
    });

    test("rejects another external subscription", async () => {
      const payment = paymentOf();

      await sync({ payment });

      const result = await sync({ payment: paymentOf({ status: SubscriptionStatus.INACTIVE }) });

      const rows = await referencesOf();

      expect(result.status).toBe("error");
      expect((await subscriptionOf()).status).toBe(SubscriptionStatus.ACTIVE);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.externalSubscriptionId).toBe(payment.externalIds.subscriptionId);
    });

    test("rolls back when the external subscription belongs to another organization", async () => {
      const otherOrganizationId = await createOrganization(db, TEST_USER_ID);
      const payment = paymentOf({ organizationId: otherOrganizationId });

      await sync({ payment });

      const result = await sync({
        payment: { ...payment, organizationId, status: SubscriptionStatus.INACTIVE },
      });

      expect(result.status).toBe("error");
      expect((await subscriptionOf()).status).toBe(SubscriptionStatus.ACTIVE);
      expect(await referencesOf()).toHaveLength(0);
      expect((await subscriptionOf(otherOrganizationId)).status).toBe(SubscriptionStatus.ACTIVE);
    });

    test("fails for an organization without subscription", async () => {
      const result = await sync({ payment: paymentOf({ organizationId: TEST_MISSING_ORG_ID }) });

      expect(result.status).toBe("error");
    });
  });

  describe("update of the subscription", () => {
    test("applies the status of a later event", async () => {
      const payment = paymentOf();

      await sync({ payment });

      const result = await sync({ payment: { ...payment, status: SubscriptionStatus.PAST_DUE } });

      expect(result.status).toBe("success");
      expect((await subscriptionOf()).status).toBe(SubscriptionStatus.PAST_DUE);
      expect(await referencesOf()).toHaveLength(1);
    });

    test("keeps the end of the subscription when the payment has none", async () => {
      const payment = paymentOf();

      await sync({ payment });
      await sync({
        payment: { ...payment, status: SubscriptionStatus.INACTIVE, periodEnd: undefined },
      });

      const subscription = await subscriptionOf();

      expect(subscription.status).toBe(SubscriptionStatus.INACTIVE);
      expect(subscription.periodEnd).toEqual(payment.periodEnd ?? null);
    });

    test("renews a subscription on a claim that has expired since", async () => {
      const payment = paymentOf();
      const periodEnd = new Date(Date.now() + 60 * DAY_MS);

      await sync({ payment });
      await expireClaim();

      const result = await sync({ payment: { ...payment, periodEnd } });

      expect(result.status).toBe("success");
      expect((await subscriptionOf()).periodEnd).toEqual(periodEnd);
    });

    test("rejects moving a subscription to an expired claim", async () => {
      await expireClaim();

      const result = await sync({ payment: paymentOf() });

      expect(result.status).toBe("error");
      expect((await subscriptionOf()).claimId).not.toBe(claimId);
      expect(await referencesOf()).toHaveLength(0);
    });

    test("changes nothing for a product without claim", async () => {
      const payment = paymentOf({ status: SubscriptionStatus.INACTIVE });

      const result = await sync({
        payment: {
          ...payment,
          externalIds: { ...payment.externalIds, productId: `prod_${crypto.randomUUID()}` },
        },
      });

      expect(result.status).toBe("error");
      expect((await subscriptionOf()).status).toBe(SubscriptionStatus.ACTIVE);
      expect(await referencesOf()).toHaveLength(0);
    });
  });
});
