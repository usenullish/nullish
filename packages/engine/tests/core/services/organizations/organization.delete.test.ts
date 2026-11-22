import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema, MembershipRole } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DeleteOrganizationService } from "../../../../src/core/services/organizations/organization.delete";
import { EngineError } from "../../../../src/errors";
import { InvalidArrayLengthError, type Nullable } from "@usenullish/nullish-common";
import type { ProcessPayments } from "@usenullish/nullish-schema/payments";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../_test-utils";

const organizations = DbSchema.Core.Organizations.OrganizationsSchema;
const memberships = DbSchema.Core.Memberships.MembershipsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const cancel = mock<ProcessPayments["cancel"]>(async () => undefined);

const payments: ProcessPayments = {
  handle: mock<ProcessPayments["handle"]>(async () => undefined),
  checkout: mock<ProcessPayments["checkout"]>(async () => ({
    url: "https://checkout.stripe.com/c/pay/cs_1",
  })),
  manage: mock<ProcessPayments["manage"]>(async () => ({
    url: "https://billing.stripe.com/p/session/bps_1",
  })),
  cancel,
  listPlans: mock<ProcessPayments["listPlans"]>(async () => []),
};

const deleteOrganization = ({
  organizationId,
  userId = TEST_USER_ID,
  payments = null,
}: {
  organizationId: string;
  userId?: string;
  payments?: Nullable<ProcessPayments>;
}) => DeleteOrganizationService.create({ db, userId, organizationId, payments }).delete();

const deletedAtOf = async (organizationId: string): Promise<Date | null | undefined> => {
  const [row] = await db
    .select({ deletedAt: organizations.deletedAt })
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  return row?.deletedAt;
};

describe("DeleteOrganizationService", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  afterEach(() => {
    cancel.mockReset();
    cancel.mockImplementation(async () => undefined);
  });

  describe("with payments", () => {
    test("marks the organization as deleted at the end of its cancelled subscription", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const cancelAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      cancel.mockImplementation(async () => ({ cancelAt }));

      const result = await deleteOrganization({ organizationId, payments });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(cancel).toHaveBeenCalledWith({ userId: TEST_USER_ID, organizationId });
      expect(result.result.deletedAt).toEqual(cancelAt);
      expect(await deletedAtOf(organizationId)).toEqual(cancelAt);
    });

    test("marks the organization as deleted now without a subscription to cancel", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const before = new Date();

      const result = await deleteOrganization({ organizationId, payments });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(cancel).toHaveBeenCalledTimes(1);
      expect(result.result.deletedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    test("returns an error Result and does not mark the organization when the cancellation fails", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const err = new Error("Stripe is down");
      cancel.mockImplementation(async () => {
        throw err;
      });

      const result = await deleteOrganization({ organizationId, payments });

      expect(result.status === "error" && result.err).toBe(err);
      expect(await deletedAtOf(organizationId)).toBeNull();
    });
  });

  test("marks the organization of the admin as deleted and returns it", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const result = await deleteOrganization({ organizationId });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.id).toBe(organizationId);
    expect(result.result.deletedAt).toBeInstanceOf(Date);
    expect(await deletedAtOf(organizationId)).toEqual(result.result.deletedAt);
  });

  test("returns an error Result for an organization already marked as deleted", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    await deleteOrganization({ organizationId });
    const deletedAt = await deletedAtOf(organizationId);

    const result = await deleteOrganization({ organizationId });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(EngineError);
    expect(result.err instanceof Error && result.err.message).toContain(
      "is already marked as deleted",
    );
    expect(await deletedAtOf(organizationId)).toEqual(deletedAt);
  });

  test("returns an error Result for a member who is not an admin", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: MembershipRole.ACCOUNTANT });

    const result = await deleteOrganization({ organizationId, userId: TEST_OTHER_USER_ID });

    expect(result.status === "error" && result.err).toBeInstanceOf(InvalidArrayLengthError);
    expect(await deletedAtOf(organizationId)).toBeNull();
  });

  test("returns an error Result for a user outside the organization", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const result = await deleteOrganization({ organizationId, userId: TEST_OTHER_USER_ID });

    expect(result.status === "error" && result.err).toBeInstanceOf(InvalidArrayLengthError);
    expect(await deletedAtOf(organizationId)).toBeNull();
  });

  test("returns an error Result when nothing matches", async () => {
    const result = await deleteOrganization({ organizationId: TEST_MISSING_ID });

    expect(result.status === "error" && result.err).toBeInstanceOf(InvalidArrayLengthError);
  });
});
