import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { join } from "node:path";
import { readdir, rm } from "node:fs/promises";
import { JobsInvoiceService } from "@usenullish/nullish-engine/billing";
import { envDataDir, envDbUrl } from "@usenullish/nullish-env";
import { startJobs } from "../../src/start";
import type { TriggeredJobs } from "../../src/jobs.triggered";
import type { ScheduledJobs } from "../../src/jobs.scheduled";
import {
  createBankRelation,
  createInvoice,
  createOrganization,
  createTemplate,
  openInvoice,
  resetDb,
  seedUser,
  TEST_USER_ID,
  waitFor,
} from "../_test-utils";

type ServiceArgs = Parameters<typeof JobsInvoiceService.create>[0];

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const pdfService = (invoiceId: string, jobs: TriggeredJobs): JobsInvoiceService =>
  JobsInvoiceService.create({
    db: db as unknown as ServiceArgs["db"],
    userId: TEST_USER_ID,
    invoiceId: invoiceId as ServiceArgs["invoiceId"],
    jobs,
  });

describe("JobsInvoiceService", () => {
  let orgId: string;
  let templateId: string;
  let jobs: TriggeredJobs;
  let scheduledJobs: ScheduledJobs;

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });

    orgId = await createOrganization({ db, withAddress: false });
    templateId = await createTemplate({ db, organizationId: orgId });

    const started = await startJobs();
    if (started.status === "error") {
      throw started.err;
    }
    jobs = started.result.triggered;
    scheduledJobs = started.result.scheduled;
  });

  afterAll(async () => {
    await jobs.stop();
    await scheduledJobs.stop();
    await resetDb({ db });
    await client.close();
  });

  test("returns a success Result with a scheduled job id for an existing invoice", async () => {
    const invId = await createInvoice({ db, organizationId: orgId });

    const result = await pdfService(invId, jobs).generatePdf({
      template: { type: "custom", id: templateId },
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result.jobId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    const invoiceDir = join(envDataDir(), "invoices", invId);
    const pdfFiles = await waitFor(
      () => readdir(invoiceDir).catch(() => []),
      (files) => files.some((file) => file.endsWith(".pdf")),
    );

    expect(pdfFiles.some((file) => file.endsWith(".pdf"))).toBeTrue();
    await rm(invoiceDir, { recursive: true, force: true });
  }, 15000);

  test("returns an error Result when the invoice does not exist", async () => {
    const result = await pdfService(crypto.randomUUID(), jobs).generatePdf({
      template: { type: "custom", id: templateId },
    });

    expect(result.status).toBe("error");
  });

  describe("with a bank relation", () => {
    test("generates the pdf with a bank relation of the organization of an opened invoice", async () => {
      const addressedOrgId = await createOrganization({ db, withAddress: true });
      const addressedTemplateId = await createTemplate({ db, organizationId: addressedOrgId });
      const invId = await createInvoice({ db, organizationId: addressedOrgId });
      await openInvoice({ db, invoiceId: invId });
      const bankRelationId = await createBankRelation({ db, organizationId: addressedOrgId });
      const service = pdfService(invId, jobs);

      const generated = await service.generatePdf({
        template: { type: "custom", id: addressedTemplateId },
        bankRelationId,
      });
      expect(generated.status).toBe("success");
      if (generated.status !== "success") return;

      const { jobId } = generated.result;

      const state = await waitFor(
        () => service.jobState({ jobId }),
        (result) => result.status === "success" && result.result.status === "completed",
      );

      expect(state.status).toBe("success");
      if (state.status !== "success") return;
      expect(state.result.status).toBe("completed");

      const invoiceDir = join(envDataDir(), "invoices", invId);
      await rm(invoiceDir, { recursive: true, force: true });
    }, 15000);
  });

  describe("jobState", () => {
    test("returns the completed state with the generated document id once the pdf job finishes", async () => {
      const invId = await createInvoice({ db, organizationId: orgId });
      const service = pdfService(invId, jobs);

      const generated = await service.generatePdf({ template: { type: "custom", id: templateId } });
      expect(generated.status).toBe("success");
      if (generated.status !== "success") return;

      const { jobId } = generated.result;

      const state = await waitFor(
        () => service.jobState({ jobId }),
        (result) => result.status === "success" && result.result.status === "completed",
      );

      expect(state.status).toBe("success");
      if (state.status !== "success") return;
      expect(state.result.status).toBe("completed");
      if (state.result.status !== "completed") return;
      expect(state.result.result.documentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      const invoiceDir = join(envDataDir(), "invoices", invId);
      await rm(invoiceDir, { recursive: true, force: true });
    }, 15000);

    test("returns an error Result when the invoice does not exist", async () => {
      const result = await pdfService(crypto.randomUUID(), jobs).jobState({
        jobId: crypto.randomUUID(),
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result for the job of another invoice", async () => {
      const invId = await createInvoice({ db, organizationId: orgId });
      const otherInvId = await createInvoice({ db, organizationId: orgId });

      const generated = await pdfService(invId, jobs).generatePdf({
        template: { type: "custom", id: templateId },
      });
      expect(generated.status).toBe("success");
      if (generated.status !== "success") return;

      const { jobId } = generated.result;

      const result = await pdfService(otherInvId, jobs).jobState({ jobId });

      expect(result.status).toBe("error");

      await waitFor(
        () => pdfService(invId, jobs).jobState({ jobId }),
        (state) => state.status === "success" && state.result.status === "completed",
      );

      const invoiceDir = join(envDataDir(), "invoices", invId);
      await rm(invoiceDir, { recursive: true, force: true });
    }, 15000);
  });
});
