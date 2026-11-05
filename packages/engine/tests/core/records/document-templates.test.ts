import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbSchema, DocumentType } from "@usenullish/nullish-schema/db";
import {
  DbCollectionDocumentTemplates,
  DbDocumentTemplates,
} from "../../../src/core/records/document-templates";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  createDocumentTemplate,
} from "../../_test-utils";
import type { Records } from "@usenullish/nullish-schema/records";

const documentTemplates = DbSchema.Core.Documents.DocumentTemplatesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const seedTemplate = async (organizationId: string, name: string): Promise<string> => {
  const [row] = await db
    .insert(documentTemplates)
    .values({
      organizationId,
      type: DocumentType.INVOICE,
      name,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

describe("document-templates", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbDocumentTemplates;
  let collectionStore: DbCollectionDocumentTemplates;
  let templateId: string;
  let siblingTemplateId: string;
  let otherTemplateId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    store = DbDocumentTemplates.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionDocumentTemplates.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: orgId,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE core.document_templates CASCADE;`);
    templateId = await seedTemplate(orgId, "Default Invoice");
    siblingTemplateId = await seedTemplate(siblingOrgId, "Default Invoice");
    otherTemplateId = await seedTemplate(otherOrgId, "Default Invoice");
  });

  describe("findById", () => {
    test("returns the template of the caller's organization", async () => {
      const result = await store.find({ pKey: templateId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(templateId);
      expect(result.result?.organizationId).toBe(orgId);
    });

    test("returns a template of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingTemplateId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingTemplateId);
      expect(result.result?.organizationId).toBe(siblingOrgId);
    });

    test("resolves to undefined for a template of another organization", async () => {
      const result = await store.find({ pKey: otherTemplateId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("changes the name and bumps the version", async () => {
      const result = await store.update({
        pKey: templateId,
        values: { version: 1, name: "Renamed Invoice" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.name).toBe("Renamed Invoice");
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: templateId,
        values: { version: 999, name: "Stale Rename" },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: { version: 1, name: "Missing" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError for a template of another organization", async () => {
      const result = await store.update({
        pKey: otherTemplateId,
        values: { version: 1, name: "Intruder Rename" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("list", () => {
    test("returns only the templates of the parent organization", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
      expect(result.result[0]?.id).toBe(templateId);
      expect(result.result[0]?.organizationId).toBe(orgId);
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id and returns the template parsed", async () => {
      const result = await collectionStore.insert({
        values: {
          type: DocumentType.INVOICE,
          name: "Second Template",
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.name).toBe("Second Template");
      expect(result.result.version).toBe(1);
    });

    test("returns an error Result for a duplicate type and name within the organization", async () => {
      const result = await collectionStore.insert({
        values: { type: DocumentType.INVOICE, name: "Default Invoice" },
      });

      expect(result.status).toBe("error");
    });
  });

  describe("list filters", () => {
    let filtersStore: DbCollectionDocumentTemplates;
    let templateIds: string[];

    const list = (filters: Records["Core"]["DocumentTemplates"]["Filter"]) =>
      filtersStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
        filters,
      });

    beforeEach(async () => {
      const filtersOrgId = await createOrganization(db, TEST_USER_ID);

      filtersStore = DbCollectionDocumentTemplates.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: filtersOrgId,
      });

      templateIds = [
        await createDocumentTemplate(db, filtersOrgId, "First Filters Template"),
        await createDocumentTemplate(db, filtersOrgId, "Second Filters Template"),
      ];
    });

    test("returns the templates of the type within the organization", async () => {
      const result = await list({ type: DocumentType.INVOICE });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ id }) => id)).toEqual(templateIds);
    });
  });

  describe("delete", () => {
    test("deletes a document template and returns it", async () => {
      const result = await store.delete({ pKey: templateId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(templateId);
      expect(await store.find({ pKey: templateId })).toEqual({
        status: "success",
        result: undefined,
      });
    });

    test("resolves to undefined and keeps a document template of another organization", async () => {
      const result = await store.delete({ pKey: otherTemplateId });

      expect(result).toEqual({ status: "success", result: undefined });

      const found = await DbDocumentTemplates.create({
        db,
        userId: TEST_OTHER_USER_ID,
      }).find({ pKey: otherTemplateId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(otherTemplateId);
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.delete({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
});
