import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { envDataDir, envDbUrl } from "@usenullish/nullish-env";
import { StoragePath, type Jobs } from "@usenullish/nullish-schema/jobs";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { setupJobQueuesDb } from "../../src/_setup";
import {
  createInvoice,
  createLine,
  createOrganization,
  resetDb,
  seedUser,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../_test-utils";
import { ExportJob } from "../../src/jobs/exports";

const dbUrl = envDbUrl();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const client = new BunSQL(dbUrl);
const db = drizzle({ client });

class TestExportJob extends ExportJob {
  static create({ dbUrl }: { dbUrl: Common["PostgresUrl"] }): TestExportJob {
    return new this({ dbUrl });
  }

  run(args: { payload: Jobs["Exports"]["Payload"] }): Promise<Jobs["Exports"]["Result"]> {
    return this.worker(args);
  }
}

const exportDir = ({ organizationId }: { organizationId: string }): string =>
  join(envDataDir(), StoragePath.Organizations, organizationId);

const readExport = async ({
  organizationId,
  exportId,
}: {
  organizationId: string;
  exportId: string;
}): Promise<Map<string, unknown>> => {
  const bytes = await Bun.file(join(exportDir({ organizationId }), `${exportId}.tar.gz`)).bytes();
  const files = await new Bun.Archive(bytes).files();

  const entries = await Promise.all(
    [...files].map(async ([path, file]) => [path, JSON.parse(await file.text())] as const),
  );

  return new Map(entries);
};

describe("ExportJob", () => {
  let job: TestExportJob;
  let organizationId: string;
  let otherOrganizationId: string;
  let invoiceId: string;
  let otherInvoiceId: string;

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });
    await seedUser({ db, userId: TEST_OTHER_USER_ID });

    organizationId = await createOrganization({ db, withAddress: true });
    otherOrganizationId = await createOrganization({ db, withAddress: true });

    invoiceId = await createInvoice({ db, organizationId });
    await createLine({ db, invoiceId, description: "Consulting" });

    otherInvoiceId = await createInvoice({ db, organizationId: otherOrganizationId });

    await setupJobQueuesDb({ dbUrl });
    job = TestExportJob.create({ dbUrl });
  });

  afterAll(async () => {
    await job.stop();
    await rm(exportDir({ organizationId }), { recursive: true, force: true });
    await resetDb({ db });
    await client.close();
  });

  test("returns an export id and stores the archive under the organization", async () => {
    const { exportId } = await job.run({ payload: { userId: TEST_USER_ID, organizationId } });

    expect(exportId).toMatch(UUID_PATTERN);
    expect(
      await Bun.file(join(exportDir({ organizationId }), `${exportId}.tar.gz`)).exists(),
    ).toBeTrue();
  });

  test("holds one JSON file per table of the organization", async () => {
    const { exportId } = await job.run({ payload: { userId: TEST_USER_ID, organizationId } });

    const files = await readExport({ organizationId, exportId });

    expect([...files.keys()].sort()).toEqual([
      "banking/movement_journal_entries.json",
      "banking/movements.json",
      "banking/statements.json",
      "billing/clients.json",
      "billing/contacts.json",
      "billing/invoice_journal_entries.json",
      "billing/invoices.json",
      "billing/lines.json",
      "core/accounting_settings.json",
      "core/bank_relations.json",
      "core/billing_settings.json",
      "core/organizations.json",
      "core/vat_methods.json",
      "core/vat_periods.json",
      "core/vat_rates.json",
      "core/vat_settings.json",
      "ledger/accounts.json",
      "ledger/journal_entries.json",
      "ledger/period_journal_entries.json",
      "ledger/periods.json",
      "ledger/posting_manual_vat_postings.json",
      "ledger/postings.json",
      "ledger/system_accounts.json",
    ]);
  });

  test("exports only the rows of the organization", async () => {
    const { exportId } = await job.run({ payload: { userId: TEST_USER_ID, organizationId } });

    const files = await readExport({ organizationId, exportId });

    expect(files.get("core/organizations.json")).toEqual([
      expect.objectContaining({ id: organizationId }),
    ]);
    expect(files.get("billing/invoices.json")).toEqual([
      expect.objectContaining({ id: invoiceId, organizationId }),
    ]);
    expect(JSON.stringify(files.get("billing/invoices.json"))).not.toContain(otherInvoiceId);
  });

  test("encodes the dates, the timestamps and the amounts with the codecs", async () => {
    const { exportId } = await job.run({ payload: { userId: TEST_USER_ID, organizationId } });

    const files = await readExport({ organizationId, exportId });

    expect(files.get("billing/invoices.json")).toEqual([
      expect.objectContaining({
        issueOn: { __date__: "2026-01-01" },
        dueOn: null,
        createdAt: { __timestamp__: expect.any(String) },
      }),
    ]);
    expect(files.get("billing/lines.json")).toEqual([
      expect.objectContaining({ description: "Consulting", unitPrice: { __bigint__: "1250" } }),
    ]);
  });

  test("throws when the user is not a member of the organization", async () => {
    await expect(
      job.run({ payload: { userId: TEST_OTHER_USER_ID, organizationId } }),
    ).rejects.toThrow();
  });
});
