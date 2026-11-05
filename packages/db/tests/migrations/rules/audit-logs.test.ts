import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL, CryptoHasher } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const invitations = DbSchema.Core.Invitations.InvitationsSchema;

const asUser = <T>(
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);
    return await fn(tx);
  });

const logsOf = (recordId: string) =>
  db.execute<{
    table_schema: string;
    table_name: string;
    organization_id: string;
    operation: string;
    user_id: string;
  }>(
    sql`SELECT table_schema, table_name, organization_id, operation, user_id FROM audit.logs WHERE record_id = ${recordId} ORDER BY logged_at`,
  );

describe("audit.logs", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("records a change made by a user with their id", async () => {
    const [row] = await asUser((tx) =>
      tx
        .insert(invitations)
        .values({
          organizationId,
          email: "invited@test.dev",
          role: "reviewer",
          tokenHash: new CryptoHasher("sha256").update(crypto.randomUUID()).digest("hex"),
        })
        .returning(),
    );
    assertNonNullish(row);

    const [log] = await logsOf(row.id);

    expect(log?.table_schema).toBe("core");
    expect(log?.table_name).toBe("invitations");
    expect(log?.operation).toBe("insert");
    expect(log?.user_id).toBe(TEST_USER_ID);
  });

  test("records the deletion of an invitation", async () => {
    const [row] = await asUser((tx) =>
      tx
        .insert(invitations)
        .values({
          organizationId,
          email: "revoked@test.dev",
          role: "reviewer",
          tokenHash: new CryptoHasher("sha256").update(crypto.randomUUID()).digest("hex"),
        })
        .returning(),
    );
    assertNonNullish(row);

    await asUser((tx) => tx.delete(invitations).where(eq(invitations.id, row.id)));

    const operations = (await logsOf(row.id)).map(({ operation }) => operation);

    expect(operations).toEqual(["insert", "delete"]);
  });

  test("records the organization itself for an organization", async () => {
    const [log] = await logsOf(organizationId);

    expect(log?.organization_id).toBe(organizationId);
  });

  test("records the organization of a record", async () => {
    const clientId = await createClient(db, organizationId);

    const [log] = await logsOf(clientId);

    expect(log?.organization_id).toBe(organizationId);
  });

  test("records the organization of a child record", async () => {
    const clientId = await createClient(db, organizationId);
    const invoiceId = await createDraftInvoice(db, organizationId, clientId);
    const lineId = await createLine(db, invoiceId);

    const [log] = await logsOf(lineId);

    expect(log?.organization_id).toBe(organizationId);
  });

  test("cannot be read by a user", async () => {
    const error = await asUser((tx) => tx.execute(sql`SELECT * FROM audit.logs`)).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("permission denied");
  });

  test("cannot be written by a user", async () => {
    const error = await asUser((tx) =>
      tx.execute(
        sql`INSERT INTO audit.logs (table_schema, table_name, record_id, operation, user_id) VALUES ('core', 'organizations', ${organizationId}, 'delete', ${TEST_USER_ID})`,
      ),
    ).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("permission denied");
  });
});
