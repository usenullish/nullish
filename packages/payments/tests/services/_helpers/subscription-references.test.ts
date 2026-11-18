import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import {
  getReferencedOrganizationId,
  getSubscriptionReference,
  insertSubscriptionReference,
} from "../../../src/services/_helpers/subscription-references";
import {
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../../../admin/tests/_test-utils";

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const references = DbSchema.Subscription.SubscriptionReferences.SubscriptionReferencesSchema;

const instance = await openTestDb();
const db = instance.connection;

const provider = SubscriptionProvider.STRIPE;

const externalIdsOf = () => ({
  subscriptionId: `sub_${crypto.randomUUID()}`,
  customerId: `cus_${crypto.randomUUID()}`,
  productId: `prod_${crypto.randomUUID()}`,
});

describe("subscription references helpers", () => {
  let organizationId: string;
  let subscriptionId: string;

  const subscriptionIdOf = async (id: string): Promise<string> => {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, id));
    assertNonNullish(subscription);

    return subscription.id;
  };

  const insertReference = (externalIds = externalIdsOf()) =>
    db.transaction((tx) =>
      insertSubscriptionReference({ tx, subscriptionId, provider, externalIds }),
    );

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db, TEST_USER_ID);
    subscriptionId = await subscriptionIdOf(organizationId);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("getSubscriptionReference", () => {
    test("returns the reference of the subscription", async () => {
      const externalIds = externalIdsOf();

      await insertReference(externalIds);

      const reference = await db.transaction((tx) =>
        getSubscriptionReference({ tx, subscriptionId }),
      );

      expect(reference?.subscriptionId).toBe(subscriptionId);
      expect(reference?.externalSubscriptionId).toBe(externalIds.subscriptionId);
    });

    test("returns nothing for a subscription without reference", async () => {
      const reference = await db.transaction((tx) =>
        getSubscriptionReference({ tx, subscriptionId }),
      );

      expect(reference).toBeUndefined();
    });
  });

  describe("getReferencedOrganizationId", () => {
    test("returns the organization of the external subscription", async () => {
      const externalIds = externalIdsOf();

      await insertReference(externalIds);

      const result = await db.transaction((tx) =>
        getReferencedOrganizationId({
          tx,
          provider,
          externalSubscriptionId: externalIds.subscriptionId,
        }),
      );

      expect(result).toBe(organizationId);
    });

    test("returns nothing for an unknown external subscription", async () => {
      await insertReference();

      const result = await db.transaction((tx) =>
        getReferencedOrganizationId({
          tx,
          provider,
          externalSubscriptionId: `sub_${crypto.randomUUID()}`,
        }),
      );

      expect(result).toBeUndefined();
    });
  });

  describe("insertSubscriptionReference", () => {
    test("stores the external ids", async () => {
      const externalIds = externalIdsOf();

      await insertReference(externalIds);

      const rows = await db
        .select()
        .from(references)
        .where(eq(references.subscriptionId, subscriptionId));

      expect(rows).toHaveLength(1);
      expect(rows[0]?.provider).toBe(provider);
      expect(rows[0]?.externalCustomerId).toBe(externalIds.customerId);
      expect(rows[0]?.externalSubscriptionId).toBe(externalIds.subscriptionId);
    });

    test("rejects a second reference for a subscription", async () => {
      await insertReference();

      await expect(insertReference()).rejects.toThrow();
    });

    test("rejects an external subscription already linked to another subscription", async () => {
      const externalIds = externalIdsOf();
      const otherSubscriptionId = await subscriptionIdOf(
        await createOrganization(db, TEST_USER_ID),
      );

      await insertReference(externalIds);

      await expect(
        db.transaction((tx) =>
          insertSubscriptionReference({
            tx,
            subscriptionId: otherSubscriptionId,
            provider,
            externalIds,
          }),
        ),
      ).rejects.toThrow();
    });
  });
});
