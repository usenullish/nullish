import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { asc, eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, InvoiceStatus } from "@usenullish/nullish-schema/db";
import {
  findInvoiceById,
  getInvoice,
  listInvoices,
  listInvoicesByPaymentReferences,
  updateInvoice,
} from "../../../src/billing/_helpers/invoices";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createClient,
  createDraftInvoice,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("billing/_helpers/invoices", () => {
  let orgId: string;
  let clientId: string;
  let invoiceId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    clientId = await createClient(db, orgId);
    invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("getInvoice", () => {
    test("returns the invoice matching the id", async () => {
      const invoice = await db.transaction((tx) => getInvoice({ tx, id: invoiceId }));

      expect(invoice.id).toBe(invoiceId);
      expect(invoice.status).toBe(InvoiceStatus.DRAFT);
    });

    test("acquires the requested row lock without error", async () => {
      const invoice = await db.transaction((tx) =>
        getInvoice({ tx, id: invoiceId, lock: "update" }),
      );

      expect(invoice.id).toBe(invoiceId);
    });

    test("rejects when the id matches nothing", async () => {
      await expect(
        db.transaction((tx) => getInvoice({ tx, id: TEST_MISSING_ID })),
      ).rejects.toThrow();
    });
  });

  describe("findInvoiceById", () => {
    test("returns the invoice matching the id", async () => {
      const invoice = await db.transaction((tx) => findInvoiceById({ tx, id: invoiceId }));

      expect(invoice?.id).toBe(invoiceId);
    });

    test("resolves to undefined when the id matches nothing", async () => {
      const invoice = await db.transaction((tx) => findInvoiceById({ tx, id: TEST_MISSING_ID }));

      expect(invoice).toBeUndefined();
    });
  });

  describe("listInvoices", () => {
    const invoices = DbSchema.Billing.Invoices.InvoicesSchema;

    const queryArgs = {
      pagination: { limit: 100, offset: 0 },
      orderBy: [asc(invoices.issueOn)],
    };

    let listOrgId: string;
    let firstClientId: string;
    let secondClientId: string;
    let januaryId: string;
    let februaryId: string;
    let marchId: string;

    beforeAll(async () => {
      listOrgId = await createOrganization(db, TEST_USER_ID);
      firstClientId = await createClient(db, listOrgId);
      secondClientId = await createClient(db, listOrgId);

      januaryId = await createDraftInvoice(db, {
        organizationId: listOrgId,
        clientId: firstClientId,
        issueOn: new Date("2026-01-10"),
      });
      februaryId = await createDraftInvoice(db, {
        organizationId: listOrgId,
        clientId: secondClientId,
        issueOn: new Date("2026-02-10"),
      });
      marchId = await createDraftInvoice(db, {
        organizationId: listOrgId,
        clientId: firstClientId,
        issueOn: new Date("2026-03-10"),
      });

      await db.transaction((tx) =>
        updateInvoice({ tx, invoiceId: marchId, values: { status: InvoiceStatus.OPEN } }),
      );
    });

    test("returns every invoice of the organization when no filter is set", async () => {
      const result = await db.transaction((tx) =>
        listInvoices({ tx, organizationId: listOrgId, filters: undefined, ...queryArgs }),
      );

      expect(result.map(({ id }) => id)).toEqual([januaryId, februaryId, marchId]);
    });

    test("excludes the invoices of another organization", async () => {
      const result = await db.transaction((tx) =>
        listInvoices({ tx, organizationId: listOrgId, filters: undefined, ...queryArgs }),
      );

      expect(result.map(({ id }) => id)).not.toContain(invoiceId);
    });

    test("returns only the invoices with the status", async () => {
      const result = await db.transaction((tx) =>
        listInvoices({
          tx,
          organizationId: listOrgId,
          filters: { status: InvoiceStatus.OPEN },
          ...queryArgs,
        }),
      );

      expect(result.map(({ id }) => id)).toEqual([marchId]);
    });

    test("returns only the invoices of the client", async () => {
      const result = await db.transaction((tx) =>
        listInvoices({
          tx,
          organizationId: listOrgId,
          filters: { clientId: secondClientId },
          ...queryArgs,
        }),
      );

      expect(result.map(({ id }) => id)).toEqual([februaryId]);
    });

    test("returns the invoices issued within the inclusive date bounds", async () => {
      const result = await db.transaction((tx) =>
        listInvoices({
          tx,
          organizationId: listOrgId,
          filters: { issueOnFrom: new Date("2026-02-10"), issueOnTo: new Date("2026-03-10") },
          ...queryArgs,
        }),
      );

      expect(result.map(({ id }) => id)).toEqual([februaryId, marchId]);
    });

    test("combines the filters", async () => {
      const result = await db.transaction((tx) =>
        listInvoices({
          tx,
          organizationId: listOrgId,
          filters: { clientId: firstClientId, issueOnTo: new Date("2026-02-28") },
          ...queryArgs,
        }),
      );

      expect(result.map(({ id }) => id)).toEqual([januaryId]);
    });

    test("paginates and orders the invoices", async () => {
      const result = await db.transaction((tx) =>
        listInvoices({
          tx,
          organizationId: listOrgId,
          filters: undefined,
          pagination: { limit: 1, offset: 1 },
          orderBy: [asc(invoices.issueOn)],
        }),
      );

      expect(result.map(({ id }) => id)).toEqual([februaryId]);
    });
  });

  describe("updateInvoice", () => {
    test("applies the change and bumps the version", async () => {
      const updated = await db.transaction((tx) =>
        updateInvoice({ tx, invoiceId, values: { dueOn: new Date("2026-05-01") } }),
      );

      expect(updated.dueOn).not.toBeNull();
      expect(updated.version).toBe(2);
    });

    test("moves the invoice through a legal status transition", async () => {
      const freshId = await createDraftInvoice(db, { organizationId: orgId, clientId });

      const updated = await db.transaction((tx) =>
        updateInvoice({ tx, invoiceId: freshId, values: { status: InvoiceStatus.OPEN } }),
      );

      expect(updated.status).toBe(InvoiceStatus.OPEN);
    });

    test("rejects when the id matches nothing", async () => {
      await expect(
        db.transaction((tx) =>
          updateInvoice({
            tx,
            invoiceId: TEST_MISSING_ID,
            values: { dueOn: new Date("2026-05-01") },
          }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("listInvoicesByPaymentReferences", () => {
    const invoices = DbSchema.Billing.Invoices.InvoicesSchema;

    let organizationId: string;
    let openInvoiceId: string;
    let openReference: string;
    let paidInvoiceId: string;
    let paidReference: string;
    let otherOrganizationReference: string;

    const createInvoiceWithStatus = async ({
      invoiceOrganizationId,
      status,
    }: {
      invoiceOrganizationId: string;
      status: InvoiceStatus;
    }): Promise<{ id: string; paymentReference: string }> => {
      const invoiceClientId = await createClient(db, invoiceOrganizationId);
      const id = await createDraftInvoice(db, {
        organizationId: invoiceOrganizationId,
        clientId: invoiceClientId,
      });

      await db.update(invoices).set({ status: InvoiceStatus.OPEN }).where(eq(invoices.id, id));

      if (status !== InvoiceStatus.OPEN) {
        await db.update(invoices).set({ status }).where(eq(invoices.id, id));
      }

      const [row] = await db.select().from(invoices).where(eq(invoices.id, id));
      assertNonNullish(row?.paymentReference);

      return { id, paymentReference: row.paymentReference };
    };

    beforeAll(async () => {
      organizationId = await createOrganization(db, TEST_USER_ID);
      const otherOrganizationId = await createOrganization(db, TEST_USER_ID);

      const open = await createInvoiceWithStatus({
        invoiceOrganizationId: organizationId,
        status: InvoiceStatus.OPEN,
      });
      openInvoiceId = open.id;
      openReference = open.paymentReference;

      ({ id: paidInvoiceId, paymentReference: paidReference } = await createInvoiceWithStatus({
        invoiceOrganizationId: organizationId,
        status: InvoiceStatus.PAID,
      }));

      ({ paymentReference: otherOrganizationReference } = await createInvoiceWithStatus({
        invoiceOrganizationId: otherOrganizationId,
        status: InvoiceStatus.OPEN,
      }));
    });

    const list = ({
      paymentReferences,
      statuses = [InvoiceStatus.OPEN],
    }: {
      paymentReferences: [string, ...string[]];
      statuses?: [InvoiceStatus, ...InvoiceStatus[]];
    }) =>
      db.transaction((tx) =>
        listInvoicesByPaymentReferences({ tx, organizationId, paymentReferences, statuses }),
      );

    test("returns the open invoice with the payment reference", async () => {
      const found = await list({ paymentReferences: [openReference] });

      expect(found.map(({ id }) => id)).toEqual([openInvoiceId]);
    });

    test("leaves out an invoice of another status", async () => {
      expect(await list({ paymentReferences: [paidReference] })).toEqual([]);
    });

    test("returns the invoices of every given status", async () => {
      const found = await list({
        paymentReferences: [openReference, paidReference],
        statuses: [InvoiceStatus.OPEN, InvoiceStatus.PAID],
      });

      expect(found.map(({ id }) => id).toSorted()).toEqual(
        [openInvoiceId, paidInvoiceId].toSorted(),
      );
    });

    test("leaves out an invoice of another organization", async () => {
      expect(await list({ paymentReferences: [otherOrganizationReference] })).toEqual([]);
    });

    test("returns nothing for an unknown payment reference", async () => {
      expect(await list({ paymentReferences: ["00000000000000000000"] })).toEqual([]);
    });
  });
});
