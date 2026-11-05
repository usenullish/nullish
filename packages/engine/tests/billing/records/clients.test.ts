import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbClients, DbCollectionClients } from "../../../src/billing/records/clients";
import { DbContacts } from "../../../src/billing/records/contacts";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createClient,
  createContact,
  createDraftInvoice,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";
import { ClientType } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("clients", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbClients;
  let collectionStore: DbCollectionClients;
  let clientId: string;
  let siblingClientId: string;
  let otherClientId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    store = DbClients.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionClients.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: orgId,
    });

    clientId = await createClient(db, orgId);
    siblingClientId = await createClient(db, siblingOrgId);
    otherClientId = await createClient(db, otherOrgId);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("findById", () => {
    test("returns the client of the caller's organization", async () => {
      const result = await store.find({ pKey: clientId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(clientId);
      expect(result.result?.organizationId).toBe(orgId);
    });

    test("returns a client of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingClientId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingClientId);
      expect(result.result?.organizationId).toBe(siblingOrgId);
    });

    test("resolves to undefined for a client of another organization", async () => {
      const result = await store.find({ pKey: otherClientId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("applies the change and bumps the version", async () => {
      const created = await collectionStore.insert({
        values: { name: "Before", type: ClientType.COMPANY },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await store.update({
        pKey: created.result.id,
        values: { version: created.result.version, name: "After" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.name).toBe("After");
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: clientId,
        values: { version: 999, name: "Nope" },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError for a client of another organization", async () => {
      const result = await store.update({
        pKey: otherClientId,
        values: { version: 1, name: "Intruder" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: { version: 1, name: "Ghost" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("list", () => {
    test("returns only the clients of the parent organization", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.some((row) => row.id === clientId)).toBeTrue();
      expect(result.result.every((row) => row.organizationId === orgId)).toBeTrue();
      expect(result.result.every((row) => row.id !== siblingClientId)).toBeTrue();
      expect(result.result.every((row) => row.id !== otherClientId)).toBeTrue();
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id and returns the client parsed", async () => {
      const result = await collectionStore.insert({
        values: { name: "Inserted Client", type: ClientType.COMPANY },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.name).toBe("Inserted Client");
      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.version).toBe(1);
    });

    test.each(["", "   "])("returns an error Result for the blank name %p", async (name) => {
      const result = await collectionStore.insert({
        values: { name, type: ClientType.COMPANY },
      });

      expect(result.status).toBe("error");
    });

    test("stores the communication language of the client", async () => {
      const result = await collectionStore.insert({
        values: { name: "French Client", type: ClientType.COMPANY, language: "fr" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.language).toBe("fr");
    });

    test("leaves the language empty when it is omitted", async () => {
      const result = await collectionStore.insert({
        values: { name: "Client Without Language", type: ClientType.COMPANY },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.language).toBeNull();
    });
  });

  describe("list filters", () => {
    let filtersStore: DbCollectionClients;

    const list = (filters: Records["Billing"]["Clients"]["Filter"]) =>
      filtersStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "name", direction: "asc" },
        filters,
      });

    const namesOf = (clients: readonly { name: string }[]): string[] =>
      clients.map(({ name }) => name);

    beforeAll(async () => {
      const filtersOrgId = await createOrganization(db, TEST_USER_ID);

      filtersStore = DbCollectionClients.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: filtersOrgId,
      });

      for (const values of [
        { name: "Acme SA", type: ClientType.COMPANY, email: "hello@acme.ch" },
        { name: "Beta Sàrl", type: ClientType.COMPANY, email: "contact@acme.ch" },
        { name: "Jane Doe", type: ClientType.INDIVIDUAL, email: "jane@example.com" },
      ]) {
        const result = await filtersStore.insert({ values });

        if (result.status === "error") {
          throw result.err;
        }
      }
    });

    test("returns only the clients of the type", async () => {
      const result = await list({ type: ClientType.INDIVIDUAL });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["Jane Doe"]);
    });

    test.each([
      ["ACME", ["Acme SA", "Beta Sàrl"]],
      ["jane", ["Jane Doe"]],
      ["example.com", ["Jane Doe"]],
    ])(
      "returns the clients whose name or email contains the search %p",
      async (search, expected) => {
        const result = await list({ search });

        if (result.status === "error") {
          expect(true).toBeFalse();
          return;
        }

        expect(namesOf(result.result)).toEqual(expected);
      },
    );

    test("combines the type and the search", async () => {
      const result = await list({ type: ClientType.COMPANY, search: "hello" });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(namesOf(result.result)).toEqual(["Acme SA"]);
    });
  });

  describe("delete", () => {
    test("deletes a client and returns it", async () => {
      const deletableId = await createClient(db, orgId);

      const result = await store.delete({ pKey: deletableId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(deletableId);
      expect(await store.find({ pKey: deletableId })).toEqual({
        status: "success",
        result: undefined,
      });
    });

    test("deletes the contacts of the client with it", async () => {
      const deletableId = await createClient(db, orgId);
      const contactId = await createContact(db, deletableId);

      const result = await store.delete({ pKey: deletableId });

      expect(result.status).toBe("success");

      const contact = await DbContacts.create({
        db,
        userId: TEST_USER_ID,
      }).find({ pKey: contactId });

      expect(contact).toEqual({ status: "success", result: undefined });
    });

    test("returns an error Result and keeps a client referenced by an invoice", async () => {
      const invoicedId = await createClient(db, orgId);
      await createDraftInvoice(db, { organizationId: orgId, clientId: invoicedId });

      const result = await store.delete({ pKey: invoicedId });

      expect(result.status).toBe("error");

      const found = await store.find({ pKey: invoicedId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(invoicedId);
    });

    test("resolves to undefined and keeps a client of another organization", async () => {
      const result = await store.delete({ pKey: otherClientId });

      expect(result).toEqual({ status: "success", result: undefined });

      const found = await DbClients.create({
        db,
        userId: TEST_OTHER_USER_ID,
      }).find({ pKey: otherClientId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(otherClientId);
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.delete({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
});
