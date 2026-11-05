import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL, CryptoHasher } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  clients,
  createClient,
  createOrganization,
  memberships,
  organizations,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "./_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const contacts = DbSchema.Billing.Clients.ContactsSchema;
const invitations = DbSchema.Core.Invitations.InvitationsSchema;

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

const markDeleted = (organizationId: string) =>
  asUser({
    userId: TEST_USER_ID,
    fn: (tx) =>
      tx
        .update(organizations)
        .set({ deletedAt: new Date() })
        .where(eq(organizations.id, organizationId))
        .returning(),
  });

describe("core.organizations", () => {
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
    await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: "accountant" });
  });

  test("lets an admin update the organization", async () => {
    const rows = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) =>
        tx
          .update(organizations)
          .set({ name: "Renamed" })
          .where(eq(organizations.id, organizationId))
          .returning(),
    });

    expect(rows.map(({ name }) => name)).toEqual(["Renamed"]);
  });

  test("does not let an accountant update the organization", async () => {
    const rows = await asUser({
      userId: TEST_OTHER_USER_ID,
      fn: (tx) =>
        tx
          .update(organizations)
          .set({ name: "Renamed" })
          .where(eq(organizations.id, organizationId))
          .returning(),
    });

    expect(rows).toEqual([]);
  });

  test("does not let an admin delete the organization", async () => {
    const rows = await asUser({
      userId: TEST_USER_ID,
      fn: (tx) => tx.delete(organizations).where(eq(organizations.id, organizationId)).returning(),
    });

    expect(rows).toEqual([]);

    const [row] = await db.select().from(organizations).where(eq(organizations.id, organizationId));

    expect(row?.id).toBe(organizationId);
  });

  test("lets an admin mark the organization deleted", async () => {
    const rows = await markDeleted(organizationId);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.deletedAt).toBeInstanceOf(Date);
  });

  test("does not let an accountant mark the organization deleted", async () => {
    const rows = await asUser({
      userId: TEST_OTHER_USER_ID,
      fn: (tx) =>
        tx
          .update(organizations)
          .set({ deletedAt: new Date() })
          .where(eq(organizations.id, organizationId))
          .returning(),
    });

    expect(rows).toEqual([]);
  });

  describe("once deleted", () => {
    let clientId: string;

    beforeEach(async () => {
      clientId = await createClient(db, organizationId);
      await markDeleted(organizationId);
    });

    test("is still readable by its members", async () => {
      const rows = await asUser({
        userId: TEST_OTHER_USER_ID,
        fn: (tx) => tx.select().from(organizations).where(eq(organizations.id, organizationId)),
      });

      expect(rows.map(({ id }) => id)).toEqual([organizationId]);
    });

    test("keeps its records readable by its members", async () => {
      const rows = await asUser({
        userId: TEST_OTHER_USER_ID,
        fn: (tx) => tx.select().from(clients).where(eq(clients.organizationId, organizationId)),
      });

      expect(rows.map(({ id }) => id)).toEqual([clientId]);
    });

    test("can no longer be updated by its admin", async () => {
      const rows = await asUser({
        userId: TEST_USER_ID,
        fn: (tx) =>
          tx
            .update(organizations)
            .set({ name: "Renamed" })
            .where(eq(organizations.id, organizationId))
            .returning(),
      });

      expect(rows).toEqual([]);
    });

    test("rejects creating a record", async () => {
      const error = await asUser({
        userId: TEST_OTHER_USER_ID,
        fn: (tx) => tx.insert(clients).values({ organizationId, name: "New client" }),
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("row-level security");
    });

    test("does not update a record", async () => {
      const rows = await asUser({
        userId: TEST_OTHER_USER_ID,
        fn: (tx) =>
          tx.update(clients).set({ name: "Renamed" }).where(eq(clients.id, clientId)).returning(),
      });

      expect(rows).toEqual([]);
    });

    test("does not delete a record", async () => {
      const rows = await asUser({
        userId: TEST_OTHER_USER_ID,
        fn: (tx) => tx.delete(clients).where(eq(clients.id, clientId)).returning(),
      });

      expect(rows).toEqual([]);
    });

    test("rejects creating a record that belongs to one of its records", async () => {
      const error = await asUser({
        userId: TEST_OTHER_USER_ID,
        fn: (tx) =>
          tx
            .insert(contacts)
            .values({ organizationId, clientId, firstName: "Jane", lastName: "Doe" }),
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("row-level security");
    });

    test("rejects adding a member", async () => {
      await db
        .insert(DbSchema.Auth.Auth.users)
        .values({
          id: "user-22222222-2222-4222-8222-222222222222",
          name: "Third",
          email: "third@test.dev",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();

      const error = await asUser({
        userId: TEST_USER_ID,
        fn: (tx) =>
          tx.insert(memberships).values({
            organizationId,
            userId: "user-22222222-2222-4222-8222-222222222222",
            role: "reviewer",
          }),
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("row-level security");
    });

    test("rejects creating an invitation", async () => {
      const error = await asUser({
        userId: TEST_USER_ID,
        fn: (tx) =>
          tx.insert(invitations).values({
            organizationId,
            email: "invited@test.dev",
            role: "reviewer",
            tokenHash: new CryptoHasher("sha256").update(crypto.randomUUID()).digest("hex"),
          }),
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("row-level security");
    });
  });
});
