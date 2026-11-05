import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { InvalidArrayLengthError } from "@usenullish/nullish-common";
import {
  DbCollectionTemplateContents,
  DbTemplateContents,
} from "../../../src/core/records/template-contents";
import { DbDocumentTemplates } from "../../../src/core/records/document-templates";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createDocumentTemplate,
  createOrganization,
  createTemplateContent,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("template-contents", () => {
  let templateId: string;
  let siblingTemplateId: string;
  let otherTemplateId: string;
  let store: DbTemplateContents;
  let collectionStore: DbCollectionTemplateContents;
  let contentId: string;
  let siblingContentId: string;
  let otherContentId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    const orgId = await createOrganization(db, TEST_USER_ID);
    const siblingOrgId = await createOrganization(db, TEST_USER_ID);
    const otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    templateId = await createDocumentTemplate(db, orgId);
    siblingTemplateId = await createDocumentTemplate(db, siblingOrgId);
    otherTemplateId = await createDocumentTemplate(db, otherOrgId);

    store = DbTemplateContents.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionTemplateContents.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: templateId,
    });

    contentId = await createTemplateContent(db, { templateId });
    siblingContentId = await createTemplateContent(db, { templateId: siblingTemplateId });
    otherContentId = await createTemplateContent(db, { templateId: otherTemplateId });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("findById", () => {
    test("returns the content of the caller's template", async () => {
      const result = await store.find({ pKey: contentId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(contentId);
      expect(result.result?.templateId).toBe(templateId);
    });

    test("returns a content of a template of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingContentId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingContentId);
      expect(result.result?.templateId).toBe(siblingTemplateId);
    });

    test("resolves to undefined for a content of another organization", async () => {
      const result = await store.find({ pKey: otherContentId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("replaces the html and bumps the version", async () => {
      const created = await collectionStore.insert({
        values: { language: "de", html: "<html><body>Vorher</body></html>" },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await store.update({
        pKey: created.result.id,
        values: { version: created.result.version, html: "<html><body>Nachher</body></html>" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.html).toBe("<html><body>Nachher</body></html>");
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: contentId,
        values: { version: 999, html: "<html><body>Nope</body></html>" },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError for a content of another organization", async () => {
      const result = await store.update({
        pKey: otherContentId,
        values: { version: 1, html: "<html><body>Intruder</body></html>" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("list", () => {
    test("returns only the contents of the parent template", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.some((row) => row.id === contentId)).toBeTrue();
      expect(result.result.every((row) => row.id !== siblingContentId)).toBeTrue();
      expect(result.result.every((row) => row.id !== otherContentId)).toBeTrue();
    });
  });

  describe("insert", () => {
    test("stamps the parent template id and returns the content parsed", async () => {
      const result = await collectionStore.insert({
        values: { language: "fr", html: "<html><body>Facture</body></html>" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.language).toBe("fr");
      expect(result.result.version).toBe(1);
    });

    test("returns an error Result for a second content in the same language", async () => {
      const result = await collectionStore.insert({
        values: { language: "en", html: "<html><body>Duplicate</body></html>" },
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result for a language that is not an ISO 639-1 code", async () => {
      const result = await collectionStore.insert({
        values: { language: "fra", html: "<html><body>Invoice</body></html>" },
      });

      expect(result.status).toBe("error");
    });
  });

  describe("list filters", () => {
    test("returns only the content in the language", async () => {
      const filtersTemplateId = await createDocumentTemplate(
        db,
        await createOrganization(db, TEST_USER_ID),
      );
      await createTemplateContent(db, { templateId: filtersTemplateId, language: "en" });
      await createTemplateContent(db, { templateId: filtersTemplateId, language: "it" });

      const result = await DbCollectionTemplateContents.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: filtersTemplateId,
      }).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
        filters: { language: "it" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ language }) => language)).toEqual(["it"]);
    });
  });

  describe("delete", () => {
    test("deletes a content and returns it", async () => {
      const deletableId = await createTemplateContent(db, { templateId, language: "es" });

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

    test("resolves to undefined and keeps a content of another organization", async () => {
      const result = await store.delete({ pKey: otherContentId });

      expect(result).toEqual({ status: "success", result: undefined });

      const found = await DbTemplateContents.create({
        db,
        userId: TEST_OTHER_USER_ID,
      }).find({ pKey: otherContentId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(otherContentId);
    });

    test("is deleted with its template", async () => {
      const deletableTemplateId = await createDocumentTemplate(
        db,
        await createOrganization(db, TEST_USER_ID),
      );
      const deletableContentId = await createTemplateContent(db, {
        templateId: deletableTemplateId,
      });

      const result = await DbDocumentTemplates.create({ db, userId: TEST_USER_ID }).delete({
        pKey: deletableTemplateId,
      });

      expect(result.status).toBe("success");
      expect(await store.find({ pKey: deletableContentId })).toEqual({
        status: "success",
        result: undefined,
      });
    });
  });
});
