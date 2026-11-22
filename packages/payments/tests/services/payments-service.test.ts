import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import {
  DbSchema,
  MembershipRole,
  type PostgresDbInstance,
  SubscriptionProvider,
} from "@usenullish/nullish-schema/db";
import { PaymentsServiceContext } from "../../src/services/_payments-service";
import {
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_MISSING_ORG_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../admin/tests/_test-utils";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const references = DbSchema.Subscription.SubscriptionReferences.SubscriptionReferencesSchema;

const instance = await openTestDb();
const db = instance.connection;

class TestPaymentsService extends PaymentsServiceContext {
  static create(args: { db: PostgresDbInstance }): TestPaymentsService {
    return new this(args);
  }

  assertAdminMembership({ organizationId, userId }: { organizationId: string; userId: string }) {
    return this._withDbContext((tx) => this._assertAdminMembership({ tx, organizationId, userId }));
  }

  getSubscription({ organizationId }: { organizationId: string }) {
    return this._withDbContext((tx) => this._getSubscription({ tx, organizationId }));
  }
}

describe("PaymentsServiceContext", () => {
  const getSubscription = ({ organizationId }: { organizationId: string }) =>
    TestPaymentsService.create({ db }).getSubscription({ organizationId });

  const subscriptionOf = async ({ organizationId }: { organizationId: string }) => {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));
    assertNonNullish(subscription);

    return subscription;
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("_assertAdminMembership", () => {
    const assertAdminMembership = ({
      organizationId,
      userId,
    }: {
      organizationId: string;
      userId: string;
    }) => TestPaymentsService.create({ db }).assertAdminMembership({ organizationId, userId });

    test("accepts an admin of the organization", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);

      const result = await assertAdminMembership({ organizationId, userId: TEST_USER_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("refuses a member who is not an admin", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      await db
        .insert(memberships)
        .values({ organizationId, userId: TEST_OTHER_USER_ID, role: MembershipRole.ACCOUNTANT });

      const result = await assertAdminMembership({ organizationId, userId: TEST_OTHER_USER_ID });

      expect(result.status === "error" && result.err instanceof Error && result.err.message).toBe(
        `User ${TEST_OTHER_USER_ID} is not an admin of organization ${organizationId}.`,
      );
    });

    test("refuses a user outside the organization", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);

      const result = await assertAdminMembership({ organizationId, userId: TEST_OTHER_USER_ID });

      expect(result.status === "error" && result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("_getSubscription", () => {
    test("returns the subscription of the organization and its external reference", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const subscription = await subscriptionOf({ organizationId });

      const [reference] = await db
        .insert(references)
        .values({
          subscriptionId: subscription.id,
          provider: SubscriptionProvider.STRIPE,
          externalCustomerId: `cus_${crypto.randomUUID()}`,
          externalSubscriptionId: `sub_${crypto.randomUUID()}`,
        })
        .returning();
      assertNonNullish(reference);

      const result = await getSubscription({ organizationId });

      expect(result).toEqual({ status: "success", result: { subscription, reference } });
    });

    test("returns the subscription without reference when it is not linked externally", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const subscription = await subscriptionOf({ organizationId });

      const result = await getSubscription({ organizationId });

      expect(result).toEqual({
        status: "success",
        result: { subscription, reference: undefined },
      });
    });

    test("returns an error Result for an organization without subscription", async () => {
      const result = await getSubscription({ organizationId: TEST_MISSING_ORG_ID });

      expect(result.status === "error" && result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });
});
