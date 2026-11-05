import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbCollectionContacts, DbContacts } from "../../../src/billing/records/contacts";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createClient,
  createContact,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";
import type { Records } from "@usenullish/nullish-schema/records";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("contacts", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbContacts;
  let collectionStore: DbCollectionContacts;
  let clientId: string;
  let siblingClientId: string;
  let otherClientId: string;
  let contactId: string;
  let siblingContactId: string;
  let otherContactId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    clientId = await createClient(db, orgId);
    siblingClientId = await createClient(db, siblingOrgId);
    otherClientId = await createClient(db, otherOrgId);

    store = DbContacts.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionContacts.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: clientId,
    });

    contactId = await createContact(db, clientId);
    siblingContactId = await createContact(db, siblingClientId);
    otherContactId = await createContact(db, otherClientId);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("findById", () => {
    test("returns the contact of the caller's client", async () => {
      const result = await store.find({ pKey: contactId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(contactId);
    });

    test("returns a contact of a sibling client of the caller", async () => {
      const result = await store.find({ pKey: siblingContactId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingContactId);
    });

    test("resolves to undefined for a contact of another organization", async () => {
      const result = await store.find({ pKey: otherContactId });

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
        values: { lastName: "Before" },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await store.update({
        pKey: created.result.id,
        values: { version: created.result.version, lastName: "After" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.lastName).toBe("After");
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: contactId,
        values: { version: 999, lastName: "Nope" },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError for a contact of another organization", async () => {
      const result = await store.update({
        pKey: otherContactId,
        values: { version: 1, lastName: "Intruder" },
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
        values: { version: 1, lastName: "Ghost" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("list", () => {
    test("returns only the contacts of the parent client", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.some((row) => row.id === contactId)).toBeTrue();
      expect(result.result.every((row) => row.id !== siblingContactId)).toBeTrue();
      expect(result.result.every((row) => row.id !== otherContactId)).toBeTrue();
    });
  });

  describe("insert", () => {
    test("stamps the parent client id and returns the contact parsed", async () => {
      const result = await collectionStore.insert({
        values: { lastName: "Inserted Contact" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.lastName).toBe("Inserted Contact");
      expect(result.result.version).toBe(1);
    });
  });

  describe("list filters", () => {
    let filtersStore: DbCollectionContacts;

    const list = (filters: Records["Billing"]["Contacts"]["Filter"]) =>
      filtersStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "lastName", direction: "asc" },
        filters,
      });

    beforeAll(async () => {
      const filtersOrgId = await createOrganization(db, TEST_USER_ID);
      const filtersClientId = await createClient(db, filtersOrgId);

      filtersStore = DbCollectionContacts.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: filtersClientId,
      });

      for (const values of [
        { lastName: "Muster", firstName: "Hans", email: "hans@muster.ch" },
        { lastName: "Dupont", firstName: "Marie", email: "marie@example.com" },
      ]) {
        const result = await filtersStore.insert({ values });

        if (result.status === "error") {
          throw result.err;
        }
      }
    });

    test.each([
      ["muster", ["Muster"]],
      ["MARIE", ["Dupont"]],
      ["example.com", ["Dupont"]],
      ["unknown", []],
    ])(
      "returns the contacts whose names or email contain the search %p",
      async (search, expected) => {
        const result = await list({ search });

        if (result.status === "error") {
          expect(true).toBeFalse();
          return;
        }

        expect(result.result.map(({ lastName }) => lastName)).toEqual(expected);
      },
    );
  });

  describe("delete", () => {
    test("deletes a contact and returns it", async () => {
      const deletableId = await createContact(db, clientId);

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

    test("resolves to undefined and keeps a contact of another organization", async () => {
      const result = await store.delete({ pKey: otherContactId });

      expect(result).toEqual({ status: "success", result: undefined });

      const found = await DbContacts.create({
        db,
        userId: TEST_OTHER_USER_ID,
      }).find({ pKey: otherContactId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(otherContactId);
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.delete({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
});
