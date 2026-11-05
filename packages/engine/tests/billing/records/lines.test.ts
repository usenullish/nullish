import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbCollectionLines, DbLines } from "../../../src/billing/records/lines";
import { DbInvoices } from "../../../src/billing/records/invoices";
import { envDbUrl } from "@usenullish/nullish-env";
import { InvoiceLineType, InvoiceStatus } from "@usenullish/nullish-schema/db";
import {
  createClient,
  createDraftInvoice,
  createLine,
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

describe("lines", () => {
  let orgId: string;
  let otherOrgId: string;
  let invoiceId: string;
  let siblingInvoiceId: string;
  let otherInvoiceId: string;
  let store: DbLines;
  let collectionStore: DbCollectionLines;
  let lineId: string;
  let siblingLineId: string;
  let otherLineId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    const clientId = await createClient(db, orgId);
    const otherClientId = await createClient(db, otherOrgId);

    invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
    siblingInvoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
    otherInvoiceId = await createDraftInvoice(db, {
      organizationId: otherOrgId,
      clientId: otherClientId,
    });

    store = DbLines.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionLines.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: invoiceId,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE billing.lines CASCADE;`);
    lineId = await createLine(db, invoiceId, "Parent line");
    siblingLineId = await createLine(db, siblingInvoiceId, "Sibling line");
    otherLineId = await createLine(db, otherInvoiceId, "Other line");
  });

  describe("findById", () => {
    test("returns a line of the parent invoice", async () => {
      const result = await store.find({ pKey: lineId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(lineId);
    });

    test("returns a line of a sibling invoice in the same organization", async () => {
      const result = await store.find({ pKey: siblingLineId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingLineId);
    });

    test("resolves to undefined for a line of another organization", async () => {
      const result = await store.find({ pKey: otherLineId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("always returns an error Result", async () => {
      const result = await store.update({ values: {}, pKey: lineId });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(Error);
    });
  });

  describe("list", () => {
    test("returns only the lines of the parent invoice", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
      expect(result.result[0]?.id).toBe(lineId);
    });
  });

  describe("listAll", () => {
    test("returns every line of the parent invoice in the order they were added", async () => {
      const secondLineId = await createLine(db, invoiceId, "Second line");

      const result = await collectionStore.listAll();

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ id }) => id)).toEqual([lineId, secondLineId]);
    });

    test("returns no line for an invoice without lines", async () => {
      const emptyInvoiceId = await createDraftInvoice(db, {
        organizationId: orgId,
        clientId: await createClient(db, orgId),
      });

      const result = await DbCollectionLines.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: emptyInvoiceId,
      }).listAll();

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("returns no line of an invoice of another organization", async () => {
      const result = await DbCollectionLines.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: otherInvoiceId,
      }).listAll();

      expect(result).toEqual({ status: "success", result: [] });
    });
  });

  describe("insert", () => {
    test("stamps the parent invoice id and returns the line parsed", async () => {
      const result = await collectionStore.insert({
        values: {
          type: InvoiceLineType.ITEM,
          description: "Inserted line",
          quantity: 2,
          unitPrice: 2000n,
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.description).toBe("Inserted line");
      expect(result.result.type).toBe(InvoiceLineType.ITEM);
    });

    test("the inserted line is reachable through the parent scope", async () => {
      await collectionStore.insert({
        values: {
          type: InvoiceLineType.ITEM,
          description: "Reachable line",
          quantity: 1,
          unitPrice: 500n,
        },
      });

      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map((line) => line.description)).toEqual(
        expect.arrayContaining(["Parent line", "Reachable line"]),
      );
    });
  });

  describe("list filters", () => {
    let filtersStore: DbCollectionLines;
    let itemLineId: string;
    let discountLineId: string;

    const list = (filters: Records["Billing"]["Lines"]["Filter"]) =>
      filtersStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
        filters,
      });

    beforeEach(async () => {
      const filtersOrgId = await createOrganization(db, TEST_USER_ID);
      const filtersClientId = await createClient(db, filtersOrgId);
      const filtersInvoiceId = await createDraftInvoice(db, {
        organizationId: filtersOrgId,
        clientId: filtersClientId,
      });

      filtersStore = DbCollectionLines.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: filtersInvoiceId,
      });

      itemLineId = await createLine(db, filtersInvoiceId, "Item", { type: InvoiceLineType.ITEM });
      discountLineId = await createLine(db, filtersInvoiceId, "Discount", {
        type: InvoiceLineType.DISCOUNT,
        unitPrice: 100n,
      });
    });

    test.each([
      [InvoiceLineType.ITEM, () => [itemLineId]],
      [InvoiceLineType.DISCOUNT, () => [discountLineId]],
    ])("returns only the lines of the type %p", async (type, expected) => {
      const result = await list({ type });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ id }) => id)).toEqual(expected());
    });
  });

  describe("delete", () => {
    test("deletes a line of a draft invoice and returns it", async () => {
      const result = await store.delete({ pKey: lineId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(lineId);
      expect(await store.find({ pKey: lineId })).toEqual({ status: "success", result: undefined });
    });

    test("returns an error Result and keeps a line of an invoice that is no longer a draft", async () => {
      const clientId = await createClient(db, orgId);
      const openedInvoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
      const openedLineId = await createLine(db, openedInvoiceId);

      const opened = await DbInvoices.create({ db, userId: TEST_USER_ID }).update({
        pKey: openedInvoiceId,
        values: { version: 1, status: InvoiceStatus.OPEN },
      });

      expect(opened.status).toBe("success");

      const result = await store.delete({ pKey: openedLineId });

      expect(result.status).toBe("error");

      const found = await store.find({ pKey: openedLineId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(openedLineId);
    });

    test("resolves to undefined and keeps a line of another organization", async () => {
      const result = await store.delete({ pKey: otherLineId });

      expect(result).toEqual({ status: "success", result: undefined });

      const found = await DbLines.create({
        db,
        userId: TEST_OTHER_USER_ID,
      }).find({ pKey: otherLineId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(otherLineId);
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.delete({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
});
