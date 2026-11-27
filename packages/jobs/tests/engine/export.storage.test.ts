import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { JobsExportService, StorageExportService } from "@usenullish/nullish-engine/core";
import { envDataDir, envDbUrl } from "@usenullish/nullish-env";
import { StoragePath } from "@usenullish/nullish-schema/jobs";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import { type StartedJobs, startJobs } from "../../src/start";
import type { TriggeredJobs } from "../../src/jobs.triggered";
import {
  createOrganization,
  resetDb,
  seedUser,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  waitFor,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("StorageExportService", () => {
  let jobs: TriggeredJobs;
  let closeJobs: StartedJobs["close"];
  let organizationId: string;
  let otherOrganizationId: string;

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });
    await seedUser({ db, userId: TEST_OTHER_USER_ID });

    organizationId = await createOrganization({ db, withAddress: true });
    otherOrganizationId = await createOrganization({
      db,
      withAddress: true,
      userId: TEST_OTHER_USER_ID,
    });

    const started = await startJobs();

    if (started.status === "error") {
      throw started.err;
    }

    jobs = started.result.triggered;
    closeJobs = started.result.close;
  });

  afterAll(async () => {
    await closeJobs();
    await Promise.all(
      [organizationId, otherOrganizationId].map((id) =>
        rm(join(envDataDir(), StoragePath.Organizations, id), { recursive: true, force: true }),
      ),
    );
    await resetDb({ db });
    await client.close();
  });

  const exportOf = async ({ id, userId }: { id: string; userId: string }): Promise<string> => {
    const service = JobsExportService.create({ db, userId, organizationId: id, jobs });

    const started = await service.generate();

    if (started.status === "error") {
      throw started.err;
    }

    const state = await waitFor(
      () => service.jobState({ jobId: started.result.jobId }),
      (result) => result.status === "success" && result.result.status === "completed",
    );

    if (state.status === "error" || state.result.status !== "completed") {
      throw new Error("The export did not complete");
    }

    return state.result.result.exportId;
  };

  const storageService = ({ id = organizationId }: { id?: string } = {}) =>
    StorageExportService.create({
      db,
      userId: TEST_USER_ID,
      organizationId: id,
      storage: FsStorageProvider.create(),
    });

  test("returns a success Result with the archive as a stream", async () => {
    const exportId = await exportOf({ id: organizationId, userId: TEST_USER_ID });

    const result = await storageService().stream({ exportId });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const bytes = await new Response(result.result.stream).bytes();
    const files = await new Bun.Archive(bytes).files();

    expect([...files.keys()]).toContain("core/organizations.json");
  }, 15000);

  test("returns an error Result for an export that does not exist", async () => {
    const result = await storageService().stream({ exportId: crypto.randomUUID() });

    expect(result.status).toBe("error");
  });

  test("returns an error Result for an export of an organization the user is not a member of", async () => {
    const exportId = await exportOf({ id: otherOrganizationId, userId: TEST_OTHER_USER_ID });

    const result = await storageService({ id: otherOrganizationId }).stream({ exportId });

    expect(result.status).toBe("error");
  }, 15000);
});
