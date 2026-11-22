import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, MembershipRole, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { CancelService } from "../../src/services/cancel";
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

describe("CancelService", () => {
  const externalSubscriptionId = `sub_${crypto.randomUUID()}`;

  let organizationId: string;

  const prepare = ({
    userId = TEST_USER_ID,
    organizationId: cancelOrganizationId = organizationId,
  }: {
    userId?: string;
    organizationId?: string;
  } = {}) => CancelService.create({ db }).prepare({ userId, organizationId: cancelOrganizationId });

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);

    await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: MembershipRole.ACCOUNTANT });

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));
    assertNonNullish(subscription);

    await db.insert(references).values({
      subscriptionId: subscription.id,
      provider: SubscriptionProvider.STRIPE,
      externalCustomerId: `cus_${crypto.randomUUID()}`,
      externalSubscriptionId,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("returns the external subscription of the organization to an admin", async () => {
    const result = await prepare();

    expect(result).toEqual({ status: "success", result: { externalSubscriptionId } });
  });

  test("returns nothing for an organization without external subscription", async () => {
    const unlinkedOrganizationId = await createOrganization(db, TEST_USER_ID);

    const result = await prepare({ organizationId: unlinkedOrganizationId });

    expect(result).toEqual({ status: "success", result: undefined });
  });

  test("refuses a member who is not an admin", async () => {
    const result = await prepare({ userId: TEST_OTHER_USER_ID });

    expect(result.status).toBe("error");
  });

  test("refuses an organization the user is not a member of", async () => {
    const result = await prepare({ organizationId: TEST_MISSING_ORG_ID });

    expect(result.status).toBe("error");
  });
});
