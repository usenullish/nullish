import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { JobsExportService } from "@usenullish/nullish-engine/core";
import { envDataDir, envDbUrl } from "@usenullish/nullish-env";
import { StoragePath } from "@usenullish/nullish-schema/jobs";
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

describe("JobsExportService", () => {
  let jobs: TriggeredJobs;
  let closeJobs: StartedJobs["close"];
  let organizationId: string;
  const organizationIds: string[] = [];

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });
    await seedUser({ db, userId: TEST_OTHER_USER_ID });

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
      organizationIds.map((id) =>
        rm(join(envDataDir(), StoragePath.Organizations, id), { recursive: true, force: true }),
      ),
    );
    await resetDb({ db });
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization({ db, withAddress: true });
    organizationIds.push(organizationId);
  });

  const service = ({ id = organizationId }: { id?: string } = {}) =>
    JobsExportService.create({ db, userId: TEST_USER_ID, organizationId: id, jobs });

  test("triggers the job that exports the organization", async () => {
    const started = await service().generate();

    if (started.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const state = await waitFor(
      () => service().jobState({ jobId: started.result.jobId }),
      (result) => result.status === "success" && result.result.status === "completed",
    );

    expect(state).toEqual({
      status: "success",
      result: { status: "completed", result: { exportId: expect.any(String) } },
    });
  }, 15000);

  test("returns an error Result for an organization the user is not a member of", async () => {
    const otherOrganizationId = await createOrganization({
      db,
      withAddress: true,
      userId: TEST_OTHER_USER_ID,
    });

    const result = await service({ id: otherOrganizationId }).generate();

    expect(result.status).toBe("error");
  });

  test("returns an error Result for an organization that does not exist", async () => {
    const result = await service({ id: crypto.randomUUID() }).generate();

    expect(result.status).toBe("error");
  });

  test("returns an error Result for the job state of an organization the user is not a member of", async () => {
    const otherOrganizationId = await createOrganization({
      db,
      withAddress: true,
      userId: TEST_OTHER_USER_ID,
    });

    const result = await service({ id: otherOrganizationId }).jobState({
      jobId: crypto.randomUUID(),
    });

    expect(result.status).toBe("error");
  });

  test("returns an error Result for the job of an export of another organization", async () => {
    const started = await service().generate();

    if (started.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const otherOrganizationId = await createOrganization({ db, withAddress: true });
    organizationIds.push(otherOrganizationId);

    const result = await service({ id: otherOrganizationId }).jobState({
      jobId: started.result.jobId,
    });

    expect(result.status).toBe("error");
  });
});
