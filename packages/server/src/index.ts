import { openDb } from "@usenullish/nullish-db";
import { defineApi } from "./api";

// https://zod.dev/blog/zod-4-5#zcompile
import "zod/compile";
import { startJobs } from "@usenullish/nullish-jobs";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";

const dbResult = await openDb();

if (dbResult.status === "error") {
  console.error("Cannot open DB:", dbResult.err);
  process.exit(1);
}

const jobsResult = await startJobs();

if (jobsResult.status === "error") {
  console.error("Cannot start the jobs:", jobsResult.err);
  process.exit(1);
}

const { result: db } = dbResult;
const {
  result: { triggered: triggeredJobs, scheduled: scheduledJobs },
} = jobsResult;

const { fetch: apiFetch } = defineApi({
  db,
  jobs: triggeredJobs,
  storage: FsStorageProvider.create(),
});

const apiServer = Bun.serve({
  port: 3000,
  fetch: apiFetch,
  hostname: process.env.NODE_ENV === "development" ? "127.0.0.1" : "0.0.0.0",
});

const close = async () => {
  try {
    await apiServer.stop();
  } finally {
    // We always close the job queue and DB no matter what
    await triggeredJobs.stop();
    await scheduledJobs.stop();
    await db.close();
  }
};

process.on("SIGINT", close);
process.on("SIGTERM", close);

console.log(`nullish running on http://localhost:${apiServer.port}`);
