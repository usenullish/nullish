import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL, CryptoHasher } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  memberships,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "./_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const invitations = DbSchema.Core.Invitations.InvitationsSchema;

type Role = "admin" | "accountant" | "reviewer";

const tokenHash = (): string =>
  new CryptoHasher("sha256").update(crypto.randomUUID()).digest("hex");

const asUser = <T>({
  userId,
  fn,
}: {
  userId: string;
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>;
}): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return await fn(tx);
  });

const insertInvitation = async ({
  organizationId,
  email = "invited@test.dev",
}: {
  organizationId: string;
  email?: string;
}): Promise<string> => {
  const [row] = await db
    .insert(invitations)
    .values({ organizationId, email, role: "accountant", tokenHash: tokenHash() })
    .returning();
  assertNonNullish(row);
  return row.id;
};

const invitationExists = async (id: string): Promise<boolean> => {
  const rows = await db.select().from(invitations).where(eq(invitations.id, id));
  return rows.length === 1;
};

describe("core.invitations", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
  });

  describe("as an admin", () => {
    test("creates an invitation that expires in 7 days", async () => {
      const [row] = await asUser({
        userId: TEST_USER_ID,
        fn: (tx) =>
          tx
            .insert(invitations)
            .values({
              organizationId,
              email: "invited@test.dev",
              role: "admin",
              tokenHash: tokenHash(),
            })
            .returning(),
      });

      assertNonNullish(row);

      const days = (row.expiresAt.getTime() - row.createdAt.getTime()) / (24 * 60 * 60 * 1000);

      expect(days).toBeCloseTo(7, 5);
    });

    test("lists the invitations of the organization", async () => {
      const invitationId = await insertInvitation({ organizationId });

      const rows = await asUser({
        userId: TEST_USER_ID,
        fn: (tx) =>
          tx.select().from(invitations).where(eq(invitations.organizationId, organizationId)),
      });

      expect(rows.map(({ id }) => id)).toEqual([invitationId]);
    });

    test("revokes an invitation", async () => {
      const invitationId = await insertInvitation({ organizationId });

      const rows = await asUser({
        userId: TEST_USER_ID,
        fn: (tx) => tx.delete(invitations).where(eq(invitations.id, invitationId)).returning(),
      });

      expect(rows).toHaveLength(1);
      expect(await invitationExists(invitationId)).toBeFalse();
    });

    test("cannot change an invitation", async () => {
      const invitationId = await insertInvitation({ organizationId });

      const rows = await asUser({
        userId: TEST_USER_ID,
        fn: (tx) =>
          tx
            .update(invitations)
            .set({ role: "admin" })
            .where(eq(invitations.id, invitationId))
            .returning(),
      });

      expect(rows).toEqual([]);

      const [row] = await db.select().from(invitations).where(eq(invitations.id, invitationId));

      expect(row?.role).toBe("accountant");
    });
  });

  describe.each(["accountant", "reviewer"] as const)(
    "as a member with the %s role",
    (role: Role) => {
      beforeEach(async () => {
        await db.insert(memberships).values({ organizationId, userId: TEST_OTHER_USER_ID, role });
      });

      test("cannot create an invitation", async () => {
        const error = await asUser({
          userId: TEST_OTHER_USER_ID,
          fn: (tx) =>
            tx.insert(invitations).values({
              organizationId,
              email: "invited@test.dev",
              role: "reviewer",
              tokenHash: tokenHash(),
            }),
        }).catch((e: unknown) => e);

        expect(causeMessage(error)).toContain("row-level security");
      });

      test("does not see the invitations", async () => {
        await insertInvitation({ organizationId });

        const rows = await asUser({
          userId: TEST_OTHER_USER_ID,
          fn: (tx) =>
            tx.select().from(invitations).where(eq(invitations.organizationId, organizationId)),
        });

        expect(rows).toEqual([]);
      });

      test("cannot revoke an invitation", async () => {
        const invitationId = await insertInvitation({ organizationId });

        const rows = await asUser({
          userId: TEST_OTHER_USER_ID,
          fn: (tx) => tx.delete(invitations).where(eq(invitations.id, invitationId)).returning(),
        });

        expect(rows).toEqual([]);
        expect(await invitationExists(invitationId)).toBeTrue();
      });
    },
  );

  describe("as a user outside the organization", () => {
    test("does not see the invitations", async () => {
      await insertInvitation({ organizationId });

      const rows = await asUser({
        userId: TEST_OTHER_USER_ID,
        fn: (tx) =>
          tx.select().from(invitations).where(eq(invitations.organizationId, organizationId)),
      });

      expect(rows).toEqual([]);
    });

    test("cannot create an invitation", async () => {
      const error = await asUser({
        userId: TEST_OTHER_USER_ID,
        fn: (tx) =>
          tx.insert(invitations).values({
            organizationId,
            email: "invited@test.dev",
            role: "admin",
            tokenHash: tokenHash(),
          }),
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("row-level security");
    });
  });

  test("rejects a second pending invitation for the same email, whatever its case", async () => {
    await insertInvitation({ organizationId, email: "invited@test.dev" });

    const error = await insertInvitation({ organizationId, email: "Invited@Test.dev" }).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("invitations_org_email_uidx");
  });

  test("accepts the same email in another organization", async () => {
    const otherOrganizationId = await createOrganization(db);
    await insertInvitation({ organizationId, email: "invited@test.dev" });

    const invitationId = await insertInvitation({
      organizationId: otherOrganizationId,
      email: "invited@test.dev",
    });

    expect(await invitationExists(invitationId)).toBeTrue();
  });

  test("rejects a token hash that is not a SHA-256 hex digest", async () => {
    const error = await db
      .insert(invitations)
      .values({
        organizationId,
        email: "invited@test.dev",
        role: "reviewer",
        tokenHash: "x".repeat(64),
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("invitations_token_hash_format");
  });
});
