import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { tryCatch } from "@usenullish/nullish-common";
import { ClientType } from "@usenullish/nullish-schema/db";
import { MigrateClientsService } from "../../src/services/clients.migrate";
import {
  clientByName,
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  withAuthenticatedUser,
} from "../../../admin/tests/_test-utils";

const instance = await openTestDb();
const db = instance.connection;

describe("MigrateClientsService", () => {
  let orgId: string;
  let otherOrgId: string;

  const migrate = ({
    organizationId = orgId,
    ...args
  }: { organizationId?: string } & Omit<Parameters<MigrateClientsService["migrate"]>[0], "tx">) =>
    tryCatch(() =>
      withAuthenticatedUser(db, TEST_USER_ID, (tx) =>
        MigrateClientsService.create({ organizationId }).migrate({ tx, ...args }),
      ),
    );

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("creates the new clients", async () => {
    const result = await migrate({
      clients: [{ type: ClientType.COMPANY, name: "Muster AG", city: "Zürich", contacts: [] }],
    });

    expect(result.status).toBe("success");

    const client = await clientByName(db, orgId, "Muster AG");

    expect(client.type).toBe(ClientType.COMPANY);
    expect(client.city).toBe("Zürich");
  });

  test("updates an existing client matched by name", async () => {
    const before = await clientByName(db, orgId, "Muster AG");

    const result = await migrate({
      clients: [{ type: ClientType.COMPANY, name: "Muster AG", city: "Bern", contacts: [] }],
    });

    expect(result.status).toBe("success");

    const after = await clientByName(db, orgId, "Muster AG");

    expect(after.id).toBe(before.id);
    expect(after.city).toBe("Bern");
  });

  test("returns an error Result in an organization of another user", async () => {
    const result = await migrate({
      organizationId: otherOrgId,
      clients: [{ type: ClientType.COMPANY, name: "Beispiel GmbH", contacts: [] }],
    });

    expect(result.status).toBe("error");
  });
});
