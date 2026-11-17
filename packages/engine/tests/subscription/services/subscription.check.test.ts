import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { CheckSubscriptionService } from "../../../src/subscription/services/subscription.check";
import { EngineError } from "../../../src/errors";
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

  describe("assertValid of an organization", () => {
    test("succeeds for an organization with a valid subscription", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);

      expect(await service.assertValid({ organizationId })).toEqual({
        status: "success",
        result: undefined,
      });
    });

    test("rejects a locked organization", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      await lock(organizationId);

      const result = await service.assertValid({ organizationId });

      expect(result.status === "error" ? result.err : undefined).toEqual(
        new EngineError("The subscription of this organization is not valid."),
      );
    });

    test("rejects an organization the user is not a member of", async () => {
      const organizationId = await createOrganization(db, TEST_OTHER_USER_ID);

      const result = await service.assertValid({ organizationId });

      expect(result.status === "error" ? result.err : undefined).toBeInstanceOf(EngineError);
    });
  });

  describe("assertValid without organization", () => {
    test("succeeds when one organization of the user is valid", async () => {
      const lockedId = await createOrganization(db, TEST_USER_ID);
      await createOrganization(db, TEST_USER_ID);
      await lock(lockedId);

      expect(await service.assertValid({ organizationId: null })).toEqual({
        status: "success",
        result: undefined,
      });
    });

    test("rejects when every organization of the user is locked", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      await lock(organizationId);

      const result = await service.assertValid({ organizationId: null });

      expect(result.status === "error" ? result.err : undefined).toEqual(
        new EngineError("None of the organizations has a valid subscription."),
      );
    });

    test("rejects a user without organization", async () => {
      await createOrganization(db, TEST_OTHER_USER_ID);

      const result = await service.assertValid({ organizationId: null });

      expect(result.status === "error" ? result.err : undefined).toBeInstanceOf(EngineError);
    });
  });
});
