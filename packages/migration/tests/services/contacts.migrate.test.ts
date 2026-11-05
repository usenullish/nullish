import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { tryCatch } from "@usenullish/nullish-common";
import { ClientType } from "@usenullish/nullish-schema/db";
import { MigrateClientsService } from "../../src/services/clients.migrate";
import {
  MigrateContactsClientNotFoundError,
  MigrateContactsService,
} from "../../src/services/contacts.migrate";
import {
  clientByName,
  contactsByClientId,
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_USER_ID,
  withAuthenticatedUser,
  withUser,
} from "../../../admin/tests/_test-utils";

const instance = await openTestDb();
const db = instance.connection;

describe("MigrateContactsService", () => {
  let orgId: string;

  const migrate = ({
    organizationId = orgId,
    ...args
  }: { organizationId?: string } & Omit<Parameters<MigrateContactsService["migrate"]>[0], "tx">) =>
    tryCatch(() =>
      withAuthenticatedUser(db, TEST_USER_ID, (tx) =>
        MigrateContactsService.create({ organizationId }).migrate({ tx, ...args }),
      ),
    );

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);

    await withUser(db, TEST_USER_ID, (tx) =>
      MigrateClientsService.create({ organizationId: orgId }).migrate({
        tx,
        clients: [{ type: ClientType.COMPANY, name: "Muster AG", contacts: [] }],
      }),
    );
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("creates the contacts of an existing client", async () => {
    const result = await migrate({
      clients: [
        {
          type: ClientType.COMPANY,
          name: "Muster AG",
          contacts: [{ lastName: "Muster", firstName: "Anna", email: "anna@example.com" }],
        },
      ],
    });

    expect(result.status).toBe("success");

    const client = await clientByName(db, orgId, "Muster AG");
    const contacts = await contactsByClientId(db, client.id);

    expect(contacts.map(({ lastName, firstName }) => ({ lastName, firstName }))).toEqual([
      { lastName: "Muster", firstName: "Anna" },
    ]);
  });

  test("updates an existing contact matched by last name", async () => {
    const result = await migrate({
      clients: [
        {
          type: ClientType.COMPANY,
          name: "Muster AG",
          contacts: [{ lastName: "Muster", firstName: "Anna", phone: "+41 00 000 00 00" }],
        },
      ],
    });

    expect(result.status).toBe("success");

    const client = await clientByName(db, orgId, "Muster AG");
    const contacts = await contactsByClientId(db, client.id);

    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.phone).toBe("+41 00 000 00 00");
    expect(contacts[0]?.email).toBeNull();
  });

  test("returns an error Result when the client does not exist", async () => {
    const result = await migrate({
      clients: [
        { type: ClientType.COMPANY, name: "Unknown AG", contacts: [{ lastName: "Nobody" }] },
      ],
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigrateContactsClientNotFoundError);
  });
});
