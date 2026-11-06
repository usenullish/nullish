import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { sql } from "drizzle-orm";
import { join } from "node:path";
import { readdir, rm } from "node:fs/promises";
import { envDataDir, envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish, NullishError } from "@usenullish/nullish-common";
import { DbSchema, DocumentType, LegalForm } from "@usenullish/nullish-schema/db";
import { type Jobs as JobTypes, TriggeredJobKey } from "@usenullish/nullish-schema/jobs";
import { setupJobQueuesDb } from "../src/_setup";
import { TriggeredJobs } from "../src/jobs.triggered";
import { PdfGenerator } from "../src/jobs/workers/pdf-invoices/_helpers/pdf-generator";

const dbUrl = envDbUrl();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TEST_USER_ID = "user-00000000-0000-4000-8000-000000000000";

const users = DbSchema.Auth.Auth.users;
const organizations = DbSchema.Core.Organizations.OrganizationsSchema;
const clients = DbSchema.Billing.Clients.ClientsSchema;
const invoices = DbSchema.Billing.Invoices.InvoicesSchema;
const documentTemplates = DbSchema.Core.Documents.DocumentTemplatesSchema;
const templateContents = DbSchema.Core.Documents.TemplateContentsSchema;

const client = new BunSQL(dbUrl);
const db = drizzle({ client });

const waitFor = async <T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeoutMs = 8000, intervalMs = 25 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let value = await fn();
  while (!predicate(value)) {
    if (Date.now() >= deadline) {
      throw new Error("waitFor: condition was not met before the timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    value = await fn();
  }
  return value;
};

describe("TriggeredJobs", () => {
  let jobs: TriggeredJobs;
  let invoiceId: string;
  let templateId: string;

  beforeAll(async () => {
    await db.execute(sql`TRUNCATE auth.users, core.organizations, audit.logs CASCADE;`);

    await db.insert(users).values({
      id: TEST_USER_ID,
      name: TEST_USER_ID,
      email: `${TEST_USER_ID}@test.dev`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [org] = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);
      return tx
        .insert(organizations)
        .values({ name: `Org ${TEST_USER_ID}`, legalForm: LegalForm.LLC })
        .returning();
    });
    assertNonNullish(org);

    const [clientRow] = await db
      .insert(clients)
      .values({ organizationId: org.id, name: "Test Client" })
      .returning();
    assertNonNullish(clientRow);

    const [invoice] = await db
      .insert(invoices)
      .values({
        organizationId: org.id,
        clientId: clientRow.id,
        issueOn: new Date("2026-01-01"),
        currency: "CHF",
      })
      .returning();
    assertNonNullish(invoice);
    invoiceId = invoice.id;

    const [template] = await db
      .insert(documentTemplates)
      .values({
        organizationId: org.id,
        type: DocumentType.INVOICE,
        name: "Default Invoice",
      })
      .returning();
    assertNonNullish(template);

    const [content] = await db
      .insert(templateContents)
      .values({
        organizationId: template.organizationId,
        templateId: template.id,
        language: "en",
        html: "<html><body>Invoice [[ nullish.invoice.number ]]</body></html>",
      })
      .returning();
    assertNonNullish(content);
    templateId = content.id;

    await setupJobQueuesDb({ dbUrl });
    jobs = await TriggeredJobs.start({ dbUrl });
  });

  afterAll(async () => {
    await jobs.stop();
    await PdfGenerator.close();
    await db.execute(sql`TRUNCATE auth.users, core.organizations, audit.logs CASCADE;`);
    await client.close();
  });

  test("trigger enqueues a job for a registered key and the job completes against a real invoice", async () => {
    const result = await jobs.trigger({
      key: TriggeredJobKey.PdfInvoice,
      payload: { invoiceId, template: { type: "custom", id: templateId }, userId: TEST_USER_ID },
    });

    expect(result.jobId).toMatch(UUID_PATTERN);

    const invoiceDir = join(envDataDir(), "invoices", invoiceId);
    const pdfFiles = await waitFor(
      () => readdir(invoiceDir).catch(() => []),
      (files) => files.some((file) => file.endsWith(".pdf")),
    );

    expect(pdfFiles.some((file) => file.endsWith(".pdf"))).toBeTrue();
    await rm(invoiceDir, { recursive: true, force: true });
  }, 15000);

  test("trigger throws for an unregistered key", async () => {
    await expect(
      jobs.trigger({
        key: "unknown-job" as TriggeredJobKey,
        payload: {},
      }),
    ).rejects.toBeInstanceOf(NullishError);
  });

  test("trigger tells that the job has not been started for an unregistered key", async () => {
    await expect(
      jobs.trigger({
        key: "unknown-job" as TriggeredJobKey,
        payload: {},
      }),
    ).rejects.toThrow("Job unknown-job has not been started");
  });

  test("trigger throws for a payload that fails schema validation", async () => {
    await expect(
      jobs.trigger({
        key: TriggeredJobKey.PdfInvoice,
        payload: { invoiceId: "not-a-uuid" },
      }),
    ).rejects.toThrow();
  });

  test("getState returns the completed state once the job finishes", async () => {
    const { jobId } = await jobs.trigger({
      key: TriggeredJobKey.PdfInvoice,
      payload: { invoiceId, template: { type: "custom", id: templateId }, userId: TEST_USER_ID },
    });

    const state = await waitFor(
      () =>
        jobs.getState<JobTypes["PdfInvoices"]["State"]>({ key: TriggeredJobKey.PdfInvoice, jobId }),
      (value) => value.status === "completed",
    );

    expect(state.status).toBe("completed");
    if (state.status !== "completed") return;
    expect(state.result.documentId).toMatch(UUID_PATTERN);

    const invoiceDir = join(envDataDir(), "invoices", invoiceId);
    await rm(invoiceDir, { recursive: true, force: true });
  }, 15000);

  test("getState throws for an unregistered key", async () => {
    await expect(
      jobs.getState({ key: "unknown-job" as TriggeredJobKey, jobId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(NullishError);
  });

  test("getState throws for a job id that does not exist", async () => {
    await expect(
      jobs.getState({ key: TriggeredJobKey.PdfInvoice, jobId: crypto.randomUUID() }),
    ).rejects.toThrow();
  });

  test("getPayload returns the payload the job was triggered with", async () => {
    const payload = {
      invoiceId,
      template: { type: "custom" as const, id: templateId },
      userId: TEST_USER_ID,
    };

    const { jobId } = await jobs.trigger({ key: TriggeredJobKey.PdfInvoice, payload });

    expect(
      await jobs.getPayload<JobTypes["PdfInvoices"]["Payload"]>({
        key: TriggeredJobKey.PdfInvoice,
        jobId,
      }),
    ).toEqual(payload);

    await waitFor(
      () =>
        jobs.getState<JobTypes["PdfInvoices"]["State"]>({ key: TriggeredJobKey.PdfInvoice, jobId }),
      (value) => value.status === "completed",
    );

    const invoiceDir = join(envDataDir(), "invoices", invoiceId);
    await rm(invoiceDir, { recursive: true, force: true });
  }, 15000);

  test("getPayload throws for an unregistered key", async () => {
    await expect(
      jobs.getPayload({ key: "unknown-job" as TriggeredJobKey, jobId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(NullishError);
  });

  test("stop resolves without throwing", async () => {
    const stoppable = await TriggeredJobs.start({ dbUrl });

    await expect(stoppable.stop()).resolves.toBeUndefined();
  });
});
