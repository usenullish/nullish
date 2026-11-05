import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { causeMessage, createClient, createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const contacts = DbSchema.Billing.Clients.ContactsSchema;

const insertContact = ({
  organizationId,
  clientId,
}: {
  organizationId: string;
  clientId: string;
}) => db.insert(contacts).values({ organizationId, clientId, lastName: "Contact" }).returning();

describe("check_contacts_organization", () => {
  let organizationId: string;
  let clientId: string;
  let otherOrganizationId: string;
  let otherClientId: string;

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
    clientId = await createClient(db, organizationId);

    otherOrganizationId = await createOrganization(db);
    otherClientId = await createClient(db, otherOrganizationId);
  });

  test("accepts a contact with the organization of its client", async () => {
    const [row] = await insertContact({ organizationId, clientId });

    expect(row?.organizationId).toBe(organizationId);
  });

  test("rejects a contact with another organization than its client", async () => {
    const error = await insertContact({ organizationId: otherOrganizationId, clientId }).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("organization_id must match the parent billing.clients");
  });

  test("rejects changing the organization of a contact", async () => {
    const [row] = await insertContact({ organizationId, clientId });
    assertNonNullish(row);

    const error = await db
      .update(contacts)
      .set({ organizationId: otherOrganizationId })
      .where(eq(contacts.id, row.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id must match the parent billing.clients");
  });

  test("rejects moving a contact to a client of another organization", async () => {
    const [row] = await insertContact({ organizationId, clientId });
    assertNonNullish(row);

    const error = await db
      .update(contacts)
      .set({ clientId: otherClientId })
      .where(eq(contacts.id, row.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id must match the parent billing.clients");
  });
});
