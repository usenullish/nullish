import { openDb } from "@usenullish/nullish-db";
import { defineApi } from "./api";
import { startJobs } from "@usenullish/nullish-jobs";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import { createMailProvider } from "@usenullish/nullish-mail";
import { envMailEnabled } from "@usenullish/nullish-env";
import type { Nullable, Result } from "@usenullish/nullish-common";
import type { SendMail } from "@usenullish/nullish-schema/mail";

// https://zod.dev/blog/zod-4-5#zcompile
import "zod/compile";

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

const mailResult: Result<Nullable<SendMail>> = envMailEnabled()
  ? createMailProvider()
  : { status: "success", result: null }; // No mail configured, no mail provider

if (mailResult.status === "error") {
  console.error("Cannot create the mail provider:", mailResult.err);
  process.exit(1);
}

const { result: db } = dbResult;
const {
  result: { triggered: triggeredJobs, close: closeJobs },
} = jobsResult;
const { result: mail } = mailResult;

const { fetch: apiFetch } = defineApi({
  db,
  jobs: triggeredJobs,
  storage: FsStorageProvider.create(),
  mail,
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
    await closeJobs();
    await db.close();
  }
};

process.on("SIGINT", close);
process.on("SIGTERM", close);

console.log(`nullish running on http://localhost:${apiServer.port}`);
