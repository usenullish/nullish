import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { envDataDir, envDbUrl } from "@usenullish/nullish-env";
import { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import type { Jobs } from "@usenullish/nullish-schema/jobs";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { setupJobQueuesDb } from "../../src/_setup";
import {
  createBankRelation,
  createInvoice,
  createOrganization,
  createTemplate,
  openInvoice,
  resetDb,
  seedUser,
  TEST_USER_ID,
} from "../_test-utils";
import { PdfInvoiceJob } from "../../src/jobs/pdf-invoices";

const dbUrl = envDbUrl();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const client = new BunSQL(dbUrl);
const db = drizzle({ client });

class TestPdfInvoiceJob extends PdfInvoiceJob {
  static create({ dbUrl }: { dbUrl: Common["PostgresUrl"] }): TestPdfInvoiceJob {
    return new this({ dbUrl });
  }

  run(args: { payload: Jobs["PdfInvoices"]["Payload"] }): Promise<Jobs["PdfInvoices"]["Result"]> {
    return this.worker(args);
  }
}

describe("PdfInvoiceJob", () => {
  let job: TestPdfInvoiceJob;
  let orgId: string;
  let otherOrgId: string;
  let invoiceId: string;
  let templateId: string;
  let bankRelationId: string;

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });

    orgId = await createOrganization({ db, withAddress: true });
    otherOrgId = await createOrganization({ db, withAddress: true });
    invoiceId = await createInvoice({ db, organizationId: orgId });
    templateId = await createTemplate({ db, organizationId: orgId });
    bankRelationId = await createBankRelation({ db, organizationId: orgId });

    await setupJobQueuesDb({ dbUrl });
    job = TestPdfInvoiceJob.create({ dbUrl });
  });

  afterAll(async () => {
    await job.stop();
    await rm(join(envDataDir(), "invoices", invoiceId), { recursive: true, force: true });
    await resetDb({ db });
    await client.close();
  });

  test("returns a document id without a bank relation", async () => {
    const result = await job.run({
      payload: { userId: TEST_USER_ID, invoiceId, template: { type: "custom", id: templateId } },
    });

    expect(result.documentId).toMatch(UUID_PATTERN);
  }, 15000);

  test("returns a document id with a bank relation of the organization of an opened invoice", async () => {
    const openedInvoiceId = await createInvoice({ db, organizationId: orgId });
    await openInvoice({ db, invoiceId: openedInvoiceId });

    const result = await job.run({
      payload: {
        userId: TEST_USER_ID,
        invoiceId: openedInvoiceId,
        template: { type: "custom", id: templateId },
        bankRelationId,
      },
    });

    expect(result.documentId).toMatch(UUID_PATTERN);

    await rm(join(envDataDir(), "invoices", openedInvoiceId), { recursive: true, force: true });
  }, 15000);

  test("returns a document id without a QR-bill for a draft invoice with a bank relation", async () => {
    const result = await job.run({
      payload: {
        userId: TEST_USER_ID,
        invoiceId,
        template: { type: "custom", id: templateId },
        bankRelationId,
      },
    });

    expect(result.documentId).toMatch(UUID_PATTERN);
  }, 15000);

  test("throws when the bank relation belongs to another organization", async () => {
    const otherBankRelationId = await createBankRelation({ db, organizationId: otherOrgId });

    await expect(
      job.run({
        payload: {
          userId: TEST_USER_ID,
          invoiceId,
          template: { type: "custom", id: templateId },
          bankRelationId: otherBankRelationId,
        },
      }),
    ).rejects.toThrow("does not belong to the organization");
  });

  test("throws when the requested bank relation does not exist", async () => {
    await expect(
      job.run({
        payload: {
          userId: TEST_USER_ID,
          invoiceId,
          template: { type: "custom", id: templateId },
          bankRelationId: crypto.randomUUID(),
        },
      }),
    ).rejects.toThrow("Bank relation");
  });

  test("returns a document id with the default template in a language", async () => {
    const result = await job.run({
      payload: {
        userId: TEST_USER_ID,
        invoiceId,
        template: { type: "default", language: DefaultTemplateLanguage.FR },
      },
    });

    expect(result.documentId).toMatch(UUID_PATTERN);
  }, 15000);

  test("throws when the template belongs to another organization", async () => {
    const otherTemplateId = await createTemplate({ db, organizationId: otherOrgId });

    await expect(
      job.run({
        payload: {
          userId: TEST_USER_ID,
          invoiceId,
          template: { type: "custom", id: otherTemplateId },
        },
      }),
    ).rejects.toThrow("does not belong to the organization");
  });

  test("throws when the template content does not exist", async () => {
    await expect(
      job.run({
        payload: {
          userId: TEST_USER_ID,
          invoiceId,
          template: { type: "custom", id: crypto.randomUUID() },
        },
      }),
    ).rejects.toThrow("Template content");
  });

  test("throws when the invoice does not exist", async () => {
    await expect(
      job.run({
        payload: {
          userId: TEST_USER_ID,
          invoiceId: crypto.randomUUID(),
          template: { type: "custom", id: templateId },
        },
      }),
    ).rejects.toThrow("Invoice");
  });

  test("throws when the organization has no complete address for a QR-bill", async () => {
    const addresslessOrgId = await createOrganization({ db, withAddress: false });
    const addresslessInvoiceId = await createInvoice({ db, organizationId: addresslessOrgId });
    await openInvoice({ db, invoiceId: addresslessInvoiceId });
    const addresslessTemplateId = await createTemplate({ db, organizationId: addresslessOrgId });
    const addresslessBankRelationId = await createBankRelation({
      db,
      organizationId: addresslessOrgId,
    });

    await expect(
      job.run({
        payload: {
          userId: TEST_USER_ID,
          invoiceId: addresslessInvoiceId,
          template: { type: "custom", id: addresslessTemplateId },
          bankRelationId: addresslessBankRelationId,
        },
      }),
    ).rejects.toThrow("has no complete address");
  });
});
