import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, MembershipRole, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { ManageService } from "../../src/services/manage";
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

describe("ManageService", () => {
  const externalCustomerId = `cus_${crypto.randomUUID()}`;

  let organizationId: string;

  const prepare = ({
    userId = TEST_USER_ID,
    organizationId: manageOrganizationId = organizationId,
  }: {
    userId?: string;
    organizationId?: string;
  } = {}) => ManageService.create({ db }).prepare({ userId, organizationId: manageOrganizationId });

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
      externalCustomerId,
      externalSubscriptionId: `sub_${crypto.randomUUID()}`,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("returns the customer of the organization to an admin", async () => {
    const result = await prepare();

    expect(result).toEqual({ status: "success", result: { externalCustomerId } });
  });

  test("refuses a member who is not an admin", async () => {
    const result = await prepare({ userId: TEST_OTHER_USER_ID });

    expect(result.status).toBe("error");
  });

  test("refuses an organization the user is not a member of", async () => {
    const result = await prepare({ organizationId: TEST_MISSING_ORG_ID });

    expect(result.status).toBe("error");
  });

  test("refuses an organization without external subscription", async () => {
    const unlinkedOrganizationId = await createOrganization(db, TEST_USER_ID);

    const result = await prepare({ organizationId: unlinkedOrganizationId });

    expect(result.status).toBe("error");
  });
});
