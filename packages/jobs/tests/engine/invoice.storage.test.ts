import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import { JobsInvoiceService, StorageInvoiceService } from "@usenullish/nullish-engine/billing";
import { envDataDir, envDbUrl } from "@usenullish/nullish-env";
import { startJobs } from "../../src/start";
import type { TriggeredJobs } from "../../src/jobs.triggered";
import type { ScheduledJobs } from "../../src/jobs.scheduled";
import {
  createInvoice,
  createOrganization,
  createTemplate,
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

const storageService = (invoiceId: string): StorageInvoiceService =>
  StorageInvoiceService.create({
    db: db as unknown as ServiceArgs["db"],
    userId: TEST_USER_ID,
    invoiceId: invoiceId as ServiceArgs["invoiceId"],
    storage: FsStorageProvider.create(),
  });

describe("StorageInvoiceService", () => {
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

  describe("stream", () => {
    test("returns a success Result with the generated pdf as a stream", async () => {
      const invId = await createInvoice({ db, organizationId: orgId });

      const generated = await pdfService(invId, jobs).generatePdf({
        template: { type: "custom", id: templateId },
      });
      expect(generated.status).toBe("success");
      if (generated.status !== "success") return;

      const { jobId } = generated.result;

      const state = await waitFor(
        () => pdfService(invId, jobs).jobState({ jobId }),
        (result) => result.status === "success" && result.result.status === "completed",
      );

      expect(state.status).toBe("success");
      if (state.status !== "success") return;
      expect(state.result.status).toBe("completed");
      if (state.result.status !== "completed") return;

      const { documentId } = state.result.result;

      const result = await storageService(invId).stream({ documentId });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.contentType).toContain("pdf");

      const chunks: Uint8Array[] = [];
      for await (const chunk of result.result.stream) {
        chunks.push(chunk);
      }
      expect(Buffer.concat(chunks).byteLength).toBeGreaterThan(0);

      const invoiceDir = join(envDataDir(), "invoices", invId);
      await rm(invoiceDir, { recursive: true, force: true });
    }, 15000);

    test("returns an error Result when the invoice does not exist", async () => {
      const result = await storageService(crypto.randomUUID()).stream({
        documentId: crypto.randomUUID(),
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the document does not exist for an existing invoice", async () => {
      const invId = await createInvoice({ db, organizationId: orgId });

      const result = await storageService(invId).stream({ documentId: crypto.randomUUID() });

      expect(result.status).toBe("error");
    });
  });
});
