import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createContacts,
  createClients,
  listContactsByClientId,
  listClientsByOrgId,
  updateClients,
} from "../../src/_helpers/clients";
import {
  clientByName,
  contactsByClientId,
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_MISSING_ORG_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  withUser,
  withUserRolledBack,
} from "../../../admin/tests/_test-utils";
import { ClientType } from "@usenullish/nullish-schema/db";

const instance = await openTestDb();
const db = instance.connection;

describe("clients services", () => {
  let orgId: string;
  let otherOrgId: string;

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

  describe("createClients", () => {
    test("inserts a client with every field", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        createClients({
          tx,
          organizationId: orgId,
          clients: [
            {
              type: ClientType.COMPANY,
              name: "Full Client",
              careOf: null,
              address: "Alte Jonastrasse 24",
              postalCode: "8640",
              city: "Rapperswil",
              country: "CH",
              email: "support@bexio.com",
              phone: "+41 71 552 00 60",
              website: "https://www.bexio.com",
              vatNumber: "CHE-107.361.103 MWST",
            },
          ],
        }),
      );

      expect(result.status).toBe("success");

      const created = await clientByName(db, orgId, "Full Client");
      expect(created.organizationId).toBe(orgId);
      expect(created.address).toBe("Alte Jonastrasse 24");
      expect(created.postalCode).toBe("8640");
      expect(created.city).toBe("Rapperswil");
      expect(created.country).toBe("CH");
      expect(created.email).toBe("support@bexio.com");
      expect(created.phone).toBe("+41 71 552 00 60");
      expect(created.website).toBe("https://www.bexio.com");
      expect(created.vatNumber).toBe("CHE-107.361.103 MWST");
      expect(created.version).toBe(1);
    });

    test("rejects a vat number that does not match the expected format", async () => {
      const result = await withUserRolledBack(db, TEST_USER_ID, (tx) =>
        createClients({
          tx,
          organizationId: orgId,
          clients: [
            {
              type: ClientType.COMPANY,
              name: "Invalid Vat Client",
              careOf: null,
              address: null,
              postalCode: null,
              city: null,
              country: null,
              email: null,
              phone: null,
              website: null,
              vatNumber: "CHE-107.361.103",
            },
          ],
        }),
      );

      expect(result.status).toBe("error");
    });

    test("inserts a client with only a name, other fields null", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        createClients({
          tx,
          organizationId: orgId,
          clients: [
            {
              type: ClientType.INDIVIDUAL,
              name: "Bare Client",
              careOf: null,
              address: null,
              postalCode: null,
              city: null,
              country: null,
              email: null,
              phone: null,
              website: null,
              vatNumber: null,
            },
          ],
        }),
      );

      expect(result.status).toBe("success");

      const created = await clientByName(db, orgId, "Bare Client");
      expect(created.type).toBe(ClientType.INDIVIDUAL);
      expect(created.address).toBeNull();
      expect(created.postalCode).toBeNull();
      expect(created.city).toBeNull();
      expect(created.country).toBeNull();
      expect(created.email).toBeNull();
      expect(created.phone).toBeNull();
      expect(created.website).toBeNull();
      expect(created.vatNumber).toBeNull();
    });

    test("inserts several clients in one call", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        createClients({
          tx,
          organizationId: orgId,
          clients: [
            {
              type: ClientType.COMPANY,
              name: "Batch Client 1",
              careOf: null,
              address: null,
              postalCode: null,
              city: null,
              country: null,
              email: null,
              phone: null,
              website: null,
              vatNumber: null,
            },
            {
              type: ClientType.COMPANY,
              name: "Batch Client 2",
              careOf: null,
              address: null,
              postalCode: null,
              city: null,
              country: null,
              email: null,
              phone: null,
              website: null,
              vatNumber: null,
            },
          ],
        }),
      );

      expect(result.status).toBe("success");

      await clientByName(db, orgId, "Batch Client 1");
      await clientByName(db, orgId, "Batch Client 2");
    });
  });

  describe("listClientsByOrgId", () => {
    test("returns clients for the organization", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listClientsByOrgId({ tx, organizationId: orgId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.some((c) => c.name === "Full Client")).toBeTrue();
      expect(result.result.every((c) => c.organizationId === orgId)).toBeTrue();
    });

    test("excludes another organization's clients", async () => {
      await withUser(db, TEST_OTHER_USER_ID, (tx) =>
        createClients({
          tx,
          organizationId: otherOrgId,
          clients: [
            {
              type: ClientType.COMPANY,
              name: "Other Org Client",
              careOf: null,
              address: null,
              postalCode: null,
              city: null,
              country: null,
              email: null,
              phone: null,
              website: null,
              vatNumber: null,
            },
          ],
        }),
      );

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listClientsByOrgId({ tx, organizationId: orgId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.some((c) => c.name === "Other Org Client")).toBeFalse();
    });

    test("returns an empty list for an organization with no clients", async () => {
      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listClientsByOrgId({ tx, organizationId: TEST_MISSING_ORG_ID }),
      );

      expect(result).toEqual({ status: "success", result: [] });
    });
  });

  describe("updateClients", () => {
    test("changes only the provided fields", async () => {
      await withUser(db, TEST_USER_ID, (tx) =>
        createClients({
          tx,
          organizationId: orgId,
          clients: [
            {
              type: ClientType.COMPANY,
              name: "Client To Update",
              careOf: null,
              address: "Original address",
              postalCode: "1000",
              city: "Original city",
              country: "CH",
              email: null,
              phone: null,
              website: null,
              vatNumber: null,
            },
          ],
        }),
      );

      const before = await clientByName(db, orgId, "Client To Update");

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        updateClients({
          tx,
          clients: [{ id: before.id, city: "Updated city" }],
        }),
      );

      expect(result.status).toBe("success");

      const after = await clientByName(db, orgId, "Client To Update");
      expect(after.city).toBe("Updated city");
      expect(after.address).toBe("Original address");
      expect(after.postalCode).toBe("1000");
      expect(after.version).toBe(before.version + 1);
    });

    test("clears a field when set to null", async () => {
      const before = await clientByName(db, orgId, "Client To Update");

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        updateClients({
          tx,
          clients: [{ id: before.id, address: null }],
        }),
      );

      expect(result.status).toBe("success");

      const after = await clientByName(db, orgId, "Client To Update");
      expect(after.address).toBeNull();
    });

    test("updates several clients in one call", async () => {
      const first = await clientByName(db, orgId, "Batch Client 1");
      const second = await clientByName(db, orgId, "Batch Client 2");

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        updateClients({
          tx,
          clients: [
            { id: first.id, city: "First city" },
            { id: second.id, city: "Second city" },
          ],
        }),
      );

      expect(result.status).toBe("success");

      const updatedFirst = await clientByName(db, orgId, "Batch Client 1");
      const updatedSecond = await clientByName(db, orgId, "Batch Client 2");
      expect(updatedFirst.city).toBe("First city");
      expect(updatedSecond.city).toBe("Second city");
    });
  });

  describe("createContacts", () => {
    test("inserts a contact for the client", async () => {
      await withUser(db, TEST_USER_ID, (tx) =>
        createClients({
          tx,
          organizationId: orgId,
          clients: [
            {
              type: ClientType.COMPANY,
              name: "Client With Contact",
              careOf: null,
              address: null,
              postalCode: null,
              city: null,
              country: null,
              email: null,
              phone: null,
              website: null,
              vatNumber: null,
            },
          ],
        }),
      );

      const { id: clientId } = await clientByName(db, orgId, "Client With Contact");

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        createContacts({
          tx,
          organizationId: orgId,
          clientId,
          contacts: [
            {
              lastName: "World",
              firstName: "Hello",
              email: "hello@example.com",
              phone: null,
            },
          ],
        }),
      );

      expect(result.status).toBe("success");

      const contacts = await contactsByClientId(db, clientId);
      expect(contacts.some((c) => c.lastName === "World" && c.firstName === "Hello")).toBeTrue();
    });

    test("inserts several contacts in one call", async () => {
      await withUser(db, TEST_USER_ID, (tx) =>
        createClients({
          tx,
          organizationId: orgId,
          clients: [
            {
              type: ClientType.COMPANY,
              name: "Client With Several Contacts",
              careOf: null,
              address: null,
              postalCode: null,
              city: null,
              country: null,
              email: null,
              phone: null,
              website: null,
              vatNumber: null,
            },
          ],
        }),
      );

      const { id: clientId } = await clientByName(db, orgId, "Client With Several Contacts");

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        createContacts({
          tx,
          organizationId: orgId,
          clientId,
          contacts: [
            { lastName: "First Contact", firstName: null, email: null, phone: null },
            { lastName: "Second Contact", firstName: null, email: null, phone: null },
          ],
        }),
      );

      expect(result.status).toBe("success");

      const contacts = await contactsByClientId(db, clientId);
      expect(contacts.some((c) => c.lastName === "First Contact")).toBeTrue();
      expect(contacts.some((c) => c.lastName === "Second Contact")).toBeTrue();
    });
  });

  describe("listContactsByClientId", () => {
    test("returns only the contacts of the given client", async () => {
      await withUser(db, TEST_USER_ID, (tx) =>
        createClients({
          tx,
          organizationId: orgId,
          clients: [
            {
              type: ClientType.COMPANY,
              name: "Client For Listing Contacts",
              careOf: null,
              address: null,
              postalCode: null,
              city: null,
              country: null,
              email: null,
              phone: null,
              website: null,
              vatNumber: null,
            },
          ],
        }),
      );

      const { id: clientId } = await clientByName(db, orgId, "Client For Listing Contacts");

      await withUser(db, TEST_USER_ID, (tx) =>
        createContacts({
          tx,
          organizationId: orgId,
          clientId,
          contacts: [{ lastName: "Listed Contact", firstName: null, email: null, phone: null }],
        }),
      );

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listContactsByClientId({ tx, clientId }),
      );

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.some((c) => c.lastName === "Listed Contact")).toBeTrue();
    });

    test("returns an empty list for a client with no contacts", async () => {
      await withUser(db, TEST_USER_ID, (tx) =>
        createClients({
          tx,
          organizationId: orgId,
          clients: [
            {
              type: ClientType.COMPANY,
              name: "Client Without Contacts",
              careOf: null,
              address: null,
              postalCode: null,
              city: null,
              country: null,
              email: null,
              phone: null,
              website: null,
              vatNumber: null,
            },
          ],
        }),
      );

      const { id: clientId } = await clientByName(db, orgId, "Client Without Contacts");

      const result = await withUser(db, TEST_USER_ID, (tx) =>
        listContactsByClientId({ tx, clientId }),
      );

      expect(result).toEqual({ status: "success", result: [] });
    });
  });
});
