import { LegalForm } from "@usenullish/nullish-schema/db";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbOrganizations } from "../../../src/core/records/organizations";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import {
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

const store = DbOrganizations.create({
  db: db as unknown as DbStoreInitArgs["db"],
  userId: TEST_USER_ID,
});

describe("organizations", () => {
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
    await client.close();
  });

  describe("list", () => {
    test("returns the organizations the caller is a member of", async () => {
      const result = await store.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.some((organization) => organization.id === orgId)).toBeTrue();
    });

    test("excludes an organization the caller is not a member of", async () => {
      const result = await store.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.every((organization) => organization.id !== otherOrgId)).toBeTrue();
    });
  });

  describe("findById", () => {
    test("returns the organization the caller is a member of", async () => {
      const result = await store.find({ pKey: orgId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(orgId);
    });

    test("resolves to undefined for an organization the caller is not a member of", async () => {
      const result = await store.find({ pKey: otherOrgId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("insert", () => {
    test("creates the organization and reads it back past the admin-bootstrap trigger", async () => {
      const result = await store.insert({
        values: { name: "Inserted Org", legalForm: LegalForm.LLC },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.name).toBe("Inserted Org");
      expect(result.result.legalForm).toBe(LegalForm.LLC);
      expect(result.result.version).toBe(1);
    });

    test("stores the address and communication fields", async () => {
      const values = {
        careOf: "c/o Fiduciaire Exemple SA",
        address: "Rue du Marché 1",
        postalCode: "3000",
        city: "Bern",
        country: "CH",
        email: "contact@inserted-details.ch",
        phone: "+41 31 000 00 00",
        website: "https://inserted-details.ch",
        language: "de",
      };

      const result = await store.insert({
        values: { name: "Inserted Details Org", legalForm: LegalForm.LLC, ...values },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toMatchObject(values);
    });

    test.each(["", "   "])("returns an error Result for the blank name %p", async (name) => {
      const result = await store.insert({ values: { name, legalForm: LegalForm.LLC } });

      expect(result.status).toBe("error");
    });

    test("leaves the address and communication fields null when they are omitted", async () => {
      const result = await store.insert({
        values: { name: "Inserted Bare Org", legalForm: LegalForm.LLC },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toMatchObject({
        careOf: null,
        address: null,
        postalCode: null,
        city: null,
        country: null,
        email: null,
        phone: null,
        website: null,
        language: null,
      });
    });
  });

  describe("update", () => {
    test("applies the change and bumps the version", async () => {
      const result = await store.update({
        pKey: orgId,
        values: { version: 1, name: "Renamed Org" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.name).toBe("Renamed Org");
      expect(result.result.version).toBe(2);
    });

    test("changes the address and communication fields", async () => {
      const inserted = await store.insert({
        values: {
          name: "Moving Org",
          legalForm: LegalForm.LLC,
          city: "Basel",
          email: "old@moving.ch",
        },
      });

      if (inserted.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await store.update({
        pKey: inserted.result.id,
        values: { version: 1, city: "Genève", email: "new@moving.ch" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toMatchObject({
        name: "Moving Org",
        city: "Genève",
        email: "new@moving.ch",
        version: 2,
      });
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: orgId,
        values: { version: 999, name: "Nope" },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError for an organization the caller cannot update", async () => {
      const result = await store.update({
        pKey: otherOrgId,
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

  describe("list filters", () => {
    const list = (filters: Records["Core"]["Organizations"]["Filter"]) =>
      DbOrganizations.create({ db, userId: TEST_USER_ID }).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
        filters,
      });

    beforeAll(async () => {
      for (const [userId, name, email, city] of [
        [TEST_USER_ID, "Acme Filters AG", "hello@acme-filters.ch", "Lausanne"],
        [TEST_USER_ID, "Beta Filters GmbH", "info@beta-filters.ch", "Zürich"],
        [TEST_OTHER_USER_ID, "Acme Filters Intruder", "hello@acme-filters.ch", "Lausanne"],
      ] as const) {
        const result = await DbOrganizations.create({ db, userId }).insert({
          values: { name, legalForm: LegalForm.LLC, email, city },
        });

        if (result.status === "error") {
          throw result.err;
        }
      }
    });

    test("returns the organizations whose name contains the search, case-insensitively", async () => {
      const result = await list({ search: "ACME FILTERS" });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ name }) => name)).toEqual(["Acme Filters AG"]);
    });

    test.each([
      ["beta-filters.ch", ["Beta Filters GmbH"]],
      ["HELLO@ACME", ["Acme Filters AG"]],
      ["lausanne", ["Acme Filters AG"]],
      ["zür", ["Beta Filters GmbH"]],
    ])(
      "returns the organizations whose email or city contains the search %p",
      async (search, expected) => {
        const result = await list({ search });

        if (result.status === "error") {
          expect(true).toBeFalse();
          return;
        }

        expect(result.result.map(({ name }) => name)).toEqual(expected);
      },
    );

    test("returns every organization of the caller when no filter is set", async () => {
      const result = await list({});

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ name }) => name)).toContain("Beta Filters GmbH");
      expect(result.result.map(({ name }) => name)).not.toContain("Acme Filters Intruder");
    });
  });
});
