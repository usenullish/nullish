import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { CheckSubscriptionService } from "../../../src/subscription/services/subscription.check";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const lock = (organizationId: string) =>
  db
    .update(subscriptions)
    .set({ status: SubscriptionStatus.INACTIVE })
    .where(eq(subscriptions.organizationId, organizationId));

describe("CheckSubscriptionService", () => {
  const service = CheckSubscriptionService.create({ db, userId: TEST_USER_ID });

  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("isValid", () => {
    test("is true for an organization with a valid subscription", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);

      expect(await service.isValid({ organizationId })).toEqual({
        status: "success",
        result: true,
      });
    });

    test("is false for a locked organization", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      await lock(organizationId);

      expect(await service.isValid({ organizationId })).toEqual({
        status: "success",
        result: false,
      });
    });

    test("is false for an organization the user is not a member of", async () => {
      const organizationId = await createOrganization(db, TEST_OTHER_USER_ID);

      expect(await service.isValid({ organizationId })).toEqual({
        status: "success",
        result: false,
      });
    });
  });

  describe("hasAnyValidSubscription", () => {
    test("is true when one organization of the user is valid", async () => {
      const lockedId = await createOrganization(db, TEST_USER_ID);
      await createOrganization(db, TEST_USER_ID);
      await lock(lockedId);

      expect(await service.hasAnyValidSubscription()).toEqual({ status: "success", result: true });
    });

    test("is false when every organization of the user is locked", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      await lock(organizationId);

      expect(await service.hasAnyValidSubscription()).toEqual({ status: "success", result: false });
    });

    test("is false for a user without organization", async () => {
      await createOrganization(db, TEST_OTHER_USER_ID);

      expect(await service.hasAnyValidSubscription()).toEqual({ status: "success", result: false });
    });
  });
});
