import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { InvalidArrayLengthError } from "@usenullish/nullish-common";
import { InvoiceStatus } from "@usenullish/nullish-schema/db";
import { DbCollectionInvoices, DbInvoices } from "../../../src/billing/records/invoices";
import { DbLines } from "../../../src/billing/records/lines";
import { envDbUrl } from "@usenullish/nullish-env";
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

describe("invoices", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbInvoices;
  let collectionStore: DbCollectionInvoices;
  let clientId: string;
  let invoiceId: string;
  let siblingInvoiceId: string;
  let otherInvoiceId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    store = DbInvoices.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionInvoices.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: orgId,
    });

    clientId = await createClient(db, orgId);
    const siblingClientId = await createClient(db, siblingOrgId);
    const otherClientId = await createClient(db, otherOrgId);

    invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
    siblingInvoiceId = await createDraftInvoice(db, {
      organizationId: siblingOrgId,
      clientId: siblingClientId,
    });
    otherInvoiceId = await createDraftInvoice(db, {
      organizationId: otherOrgId,
      clientId: otherClientId,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("findById", () => {
    test("returns the invoice of the caller's organization", async () => {
      const result = await store.find({ pKey: invoiceId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(invoiceId);
      expect(result.result?.status).toBe(InvoiceStatus.DRAFT);
    });

    test("returns an invoice of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingInvoiceId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingInvoiceId);
      expect(result.result?.status).toBe(InvoiceStatus.DRAFT);
    });

    test("resolves to undefined for an invoice of another organization", async () => {
      const result = await store.find({ pKey: otherInvoiceId });

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
        values: {
          clientId,
          issueOn: new Date("2026-03-01"),
          currency: "CHF",
        },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await store.update({
        pKey: created.result.id,
        values: { version: created.result.version, dueOn: new Date("2026-04-01") },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.dueOn).not.toBeNull();
      expect(result.result.version).toBe(2);
    });

    test("moves the invoice through a legal status transition", async () => {
      const created = await collectionStore.insert({
        values: {
          clientId,
          issueOn: new Date("2026-03-01"),
          currency: "CHF",
        },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await store.update({
        pKey: created.result.id,
        values: { version: created.result.version, status: InvoiceStatus.OPEN },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.status).toBe(InvoiceStatus.OPEN);
    });

    test("returns an error Result on an illegal status transition", async () => {
      const created = await collectionStore.insert({
        values: {
          clientId,
          issueOn: new Date("2026-03-01"),
          currency: "CHF",
        },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await store.update({
        pKey: created.result.id,
        values: { version: created.result.version, status: InvoiceStatus.PAID },
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: invoiceId,
        values: { version: 999, dueOn: new Date("2026-04-01") },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError for an invoice of another organization", async () => {
      const result = await store.update({
        pKey: otherInvoiceId,
        values: { version: 1, dueOn: new Date("2026-04-01") },
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
        values: { version: 1, dueOn: new Date("2026-04-01") },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("list", () => {
    test("returns only the invoices of the parent organization", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.some((row) => row.id === invoiceId)).toBeTrue();
      expect(result.result.every((row) => row.organizationId === orgId)).toBeTrue();
      expect(result.result.every((row) => row.id !== siblingInvoiceId)).toBeTrue();
      expect(result.result.every((row) => row.id !== otherInvoiceId)).toBeTrue();
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id and returns the draft invoice parsed", async () => {
      const result = await collectionStore.insert({
        values: {
          clientId,
          issueOn: new Date("2026-03-01"),
          currency: "CHF",
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.status).toBe(InvoiceStatus.DRAFT);
      expect(result.result.version).toBe(1);
    });
  });

  describe("list filters", () => {
    let filtersStore: DbCollectionInvoices;
    let firstClientId: string;
    let januaryInvoiceId: string;
    let marchInvoiceId: string;
    let juneInvoiceId: string;

    const list = (filters: Records["Billing"]["Invoices"]["Filter"]) =>
      filtersStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "issueOn", direction: "asc" },
        filters,
      });

    beforeAll(async () => {
      const filtersOrgId = await createOrganization(db, TEST_USER_ID);

      filtersStore = DbCollectionInvoices.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: filtersOrgId,
      });

      firstClientId = await createClient(db, filtersOrgId);
      const secondClientId = await createClient(db, filtersOrgId);

      januaryInvoiceId = await createDraftInvoice(db, {
        organizationId: filtersOrgId,
        clientId: firstClientId,
        issueOn: new Date("2026-01-10"),
      });
      marchInvoiceId = await createDraftInvoice(db, {
        organizationId: filtersOrgId,
        clientId: secondClientId,
        issueOn: new Date("2026-03-15"),
      });
      juneInvoiceId = await createDraftInvoice(db, {
        organizationId: filtersOrgId,
        clientId: firstClientId,
        issueOn: new Date("2026-06-30"),
      });

      const opening = await DbInvoices.create({ db, userId: TEST_USER_ID }).update({
        pKey: marchInvoiceId,
        values: { version: 1, status: InvoiceStatus.OPEN },
      });

      if (opening.status === "error") {
        throw opening.err;
      }
    });

    const idsOf = (invoices: readonly { id: string }[]): string[] => invoices.map(({ id }) => id);

    test("returns only the invoices with the status", async () => {
      const result = await list({ status: InvoiceStatus.OPEN });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(idsOf(result.result)).toEqual([marchInvoiceId]);
    });

    test("returns only the invoices of the client", async () => {
      const result = await list({ clientId: firstClientId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(idsOf(result.result)).toEqual([januaryInvoiceId, juneInvoiceId]);
    });

    test("returns the invoices issued within the inclusive date bounds", async () => {
      const result = await list({
        issueOnFrom: new Date("2026-03-15"),
        issueOnTo: new Date("2026-06-30"),
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(idsOf(result.result)).toEqual([marchInvoiceId, juneInvoiceId]);
    });

    test("combines the filters", async () => {
      const result = await list({
        status: InvoiceStatus.DRAFT,
        clientId: firstClientId,
        issueOnFrom: new Date("2026-02-01"),
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(idsOf(result.result)).toEqual([juneInvoiceId]);
    });
  });

  describe("delete", () => {
    test("deletes a draft invoice and returns it", async () => {
      const draftId = await createDraftInvoice(db, { organizationId: orgId, clientId });

      const result = await store.delete({ pKey: draftId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(draftId);
      expect(await store.find({ pKey: draftId })).toEqual({ status: "success", result: undefined });
    });

    test("deletes the lines of the invoice with it", async () => {
      const draftId = await createDraftInvoice(db, { organizationId: orgId, clientId });
      const lineId = await createLine(db, draftId);

      const result = await store.delete({ pKey: draftId });

      expect(result.status).toBe("success");

      const line = await DbLines.create({ db, userId: TEST_USER_ID }).find({ pKey: lineId });

      expect(line).toEqual({ status: "success", result: undefined });
    });

    test("returns an error Result and keeps an invoice that is no longer a draft", async () => {
      const draftId = await createDraftInvoice(db, { organizationId: orgId, clientId });

      const opened = await store.update({
        pKey: draftId,
        values: { version: 1, status: InvoiceStatus.OPEN },
      });

      expect(opened.status).toBe("success");

      const result = await store.delete({ pKey: draftId });

      expect(result.status).toBe("error");

      const found = await store.find({ pKey: draftId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.status).toBe(InvoiceStatus.OPEN);
    });

    test("resolves to undefined and keeps an invoice of another organization", async () => {
      const result = await store.delete({ pKey: otherInvoiceId });

      expect(result).toEqual({ status: "success", result: undefined });

      const found = await DbInvoices.create({
        db,
        userId: TEST_OTHER_USER_ID,
      }).find({ pKey: otherInvoiceId });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(otherInvoiceId);
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.delete({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
});
